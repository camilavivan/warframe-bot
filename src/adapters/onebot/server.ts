import Fastify from 'fastify';
import { fetch } from 'undici';
import type { AppConfig } from '../../config.js';
import { logger } from '../../core/logger.js';
import { dispatch } from '../../commands/registry.js';
import { toOneBotMessage, type ChatType, type ReplyPayload } from '../../commands/types.js';

const log = logger.child({ module: 'onebot' });

export interface OneBotAdapter {
  sendGroupMsg: (groupId: string, message: string) => Promise<void>;
  sendPrivateMsg: (userId: string, message: string) => Promise<void>;
  close: () => Promise<void>;
}

function extractText(event: {
  raw_message?: string;
  message?: string | Array<{ type: string; data?: { text?: string } }>;
}): string {
  let text = event.raw_message ?? '';
  if (!text && typeof event.message === 'string') text = event.message;
  if (!text && Array.isArray(event.message)) {
    text = event.message
      .filter((s) => s.type === 'text')
      .map((s) => s.data?.text ?? '')
      .join('');
  }
  return text.trim();
}

export async function startOneBot(cfg: AppConfig['onebot']): Promise<OneBotAdapter> {
  const app = Fastify({ logger: false });

  const apiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiAccessToken) {
      headers.Authorization = `Bearer ${cfg.apiAccessToken}`;
    }
    return headers;
  };

  const sendGroupMsg = async (groupId: string, message: string): Promise<void> => {
    const url = `${cfg.apiBase.replace(/\/$/, '')}/send_group_msg`;
    const res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ group_id: Number(groupId) || groupId, message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OneBot send_group_msg HTTP ${res.status}: ${body}`);
    }
    log.debug({ groupId }, 'sent group msg');
  };

  const sendPrivateMsg = async (userId: string, message: string): Promise<void> => {
    const url = `${cfg.apiBase.replace(/\/$/, '')}/send_private_msg`;
    const res = await fetch(url, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ user_id: Number(userId) || userId, message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OneBot send_private_msg HTTP ${res.status}: ${body}`);
    }
    log.debug({ userId }, 'sent private msg');
  };

  app.post('/', async (req, reply) => {
    // Optional access token check (query or header)
    if (cfg.accessToken) {
      const auth = (req.headers.authorization || '') as string;
      const token =
        auth.replace(/^Bearer\s+/i, '') ||
        (req.headers['x-self-id'] as string) ||
        (req.query as { access_token?: string }).access_token;
      const headerToken = (req.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');
      const q = req.query as { access_token?: string };
      const provided = headerToken || q.access_token || '';
      if (provided && provided !== cfg.accessToken) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
      void token;
    }

    const event = req.body as {
      post_type?: string;
      message_type?: string;
      group_id?: number | string;
      user_id?: number | string;
      raw_message?: string;
      message?: string | Array<{ type: string; data?: { text?: string } }>;
      self_id?: number;
    };

    if (event.post_type === 'meta_event') {
      return reply.send({ status: 'ok' });
    }

    if (event.post_type === 'message' && (event.message_type === 'group' || event.message_type === 'private')) {
      const chatType: ChatType = event.message_type === 'private' ? 'private' : 'group';
      const userId = String(event.user_id ?? '');
      const chatId = chatType === 'private' ? userId : String(event.group_id ?? '');
      const text = extractText(event);
      if (text && chatId) {
        dispatch({
          platform: 'onebot',
          chatType,
          chatId,
          groupId: chatId,
          userId,
          text,
          reply: async (msg: ReplyPayload) => {
            const message = toOneBotMessage(msg);
            if (chatType === 'private') {
              await sendPrivateMsg(userId, message);
            } else {
              await sendGroupMsg(chatId, message);
            }
          },
        }).catch((err) => log.error({ err }, 'dispatch error'));
      }
    }

    return reply.send({ status: 'ok' });
  });

  app.get('/health', async () => ({ ok: true }));

  await app.listen({ host: cfg.host, port: cfg.port });
  log.info({ host: cfg.host, port: cfg.port }, 'OneBot HTTP receiver listening');

  return {
    sendGroupMsg,
    sendPrivateMsg,
    close: async () => {
      await app.close();
    },
  };
}
