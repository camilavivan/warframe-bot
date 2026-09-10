import WebSocket from 'ws';
import { fetch } from 'undici';
import { inflateSync } from 'node:zlib';
import type { AppConfig } from '../../config.js';
import { logger } from '../../core/logger.js';
import { dispatch } from '../../commands/registry.js';
import { replyText, type ChatType, type ReplyPayload } from '../../commands/types.js';

const log = logger.child({ module: 'kook' });
const API = 'https://www.kookapp.cn/api/v3';

export interface KookAdapter {
  sendChannelMsg: (channelId: string, content: string) => Promise<void>;
  sendPrivateMsg: (userId: string, content: string) => Promise<void>;
  close: () => Promise<void>;
}

interface GatewaySignal {
  s: number;
  d?: unknown;
  sn?: number;
}

async function apiGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  const json = (await res.json()) as { code: number; message: string; data: T };
  if (json.code !== 0) throw new Error(`KOOK API ${path}: ${json.message}`);
  return json.data;
}

async function apiPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { code: number; message: string; data: T };
  if (json.code !== 0) throw new Error(`KOOK API ${path}: ${json.message}`);
  return json.data;
}

function parseFrame(data: WebSocket.RawData, compressed: boolean): GatewaySignal {
  let buf: Buffer;
  if (Buffer.isBuffer(data)) {
    buf = data;
  } else if (data instanceof ArrayBuffer) {
    buf = Buffer.from(data);
  } else if (Array.isArray(data)) {
    buf = Buffer.concat(data);
  } else {
    buf = Buffer.from(data as ArrayBuffer);
  }

  if (compressed) {
    try {
      buf = inflateSync(buf);
    } catch {
      // maybe already plain json
    }
  }
  return JSON.parse(buf.toString('utf8')) as GatewaySignal;
}

export async function startKook(cfg: AppConfig['kook']): Promise<KookAdapter> {
  if (!cfg.token) throw new Error('kook.token is required');

  const sendChannelMsg = async (channelId: string, content: string): Promise<void> => {
    await apiPost(cfg.token, '/message/create', {
      type: 1, // text
      target_id: channelId,
      content,
    });
    log.debug({ channelId }, 'sent channel msg');
  };

  const sendPrivateMsg = async (userId: string, content: string): Promise<void> => {
    await apiPost(cfg.token, '/direct-message/create', {
      type: 1,
      target_id: userId,
      content,
    });
    log.debug({ userId }, 'sent private msg');
  };

  let ws: WebSocket | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let sn = 0;
  let closed = false;
  let sessionId = '';

  const connect = async (): Promise<void> => {
    const compress = cfg.compress !== false;
    const gate = await apiGet<{ url: string }>(cfg.token, `/gateway/index?compress=${compress ? 1 : 0}`);
    log.info('connecting KOOK gateway');

    ws = new WebSocket(gate.url);

    ws.on('message', async (data) => {
      let frame: GatewaySignal;
      try {
        frame = parseFrame(data, compress);
      } catch (err) {
        log.warn({ err }, 'bad frame');
        return;
      }

      // 1 hello, 0 event, 3 heartbeat ack, 5 reconnect
      if (frame.s === 1) {
        const d = frame.d as { heartbeat_interval?: number; session_id?: string };
        sessionId = d.session_id ?? '';
        const interval = d.heartbeat_interval ?? 30000;
        log.info({ sessionId, interval }, 'KOOK hello');
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          ws?.send(JSON.stringify({ s: 2, sn }));
        }, interval);
        return;
      }

      if (frame.s === 0 && frame.d) {
        if (typeof frame.sn === 'number') sn = frame.sn;
        const ev = frame.d as {
          channel_type?: string;
          type?: number;
          target_id?: string;
          author_id?: string;
          content?: string;
          extra?: { type?: string; body?: unknown; author?: { bot?: boolean } };
        };

        // Ignore bot messages
        if (ev.extra?.author?.bot) return;
        // Text message: GROUP channel or PERSON (DM)
        if (ev.type === 9 || ev.type === 1) {
          const channelType = (ev.channel_type || 'GROUP').toUpperCase();
          const isPrivate = channelType === 'PERSON';
          const chatType: ChatType = isPrivate ? 'private' : 'group';
          const userId = String(ev.author_id ?? '');
          // PERSON: target_id is often the bot or session; reply to author_id
          const chatId = isPrivate ? userId : String(ev.target_id ?? '');
          const text = (ev.content ?? '').trim();
          if (!text || !chatId) return;
          dispatch({
            platform: 'kook',
            chatType,
            chatId,
            groupId: chatId,
            userId,
            text,
            reply: async (msg: ReplyPayload) => {
              const text = replyText(msg);
              if (isPrivate) {
                await sendPrivateMsg(userId, text);
              } else {
                await sendChannelMsg(chatId, text);
              }
            },
          }).catch((err) => log.error({ err }, 'dispatch error'));
        }
      }

      if (frame.s === 5) {
        log.warn('KOOK requested reconnect');
        ws?.close();
      }
    });

    ws.on('close', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      if (!closed) {
        log.warn('KOOK ws closed, reconnect in 5s');
        setTimeout(() => {
          connect().catch((err) => log.error({ err }, 'reconnect failed'));
        }, 5000);
      }
    });

    ws.on('error', (err) => log.error({ err }, 'KOOK ws error'));
  };

  await connect();

  return {
    sendChannelMsg,
    sendPrivateMsg,
    close: async () => {
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      ws?.close();
    },
  };
}
