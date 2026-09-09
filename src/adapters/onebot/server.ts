import Fastify from 'fastify';
import { fetch } from 'undici';
import type { AppConfig } from '../../config.js';
import { logger } from '../../core/logger.js';
import { dispatch } from '../../commands/registry.js';

const log = logger.child({ module: 'onebot' });

export interface OneBotAdapter {
  sendGroupMsg: (groupId: string, message: string) => Promise<void>;
  close: () => Promise<void>;
}

export async function startOneBot(cfg: AppConfig['onebot']): Promise<OneBotAdapter> {
  const app = Fastify({ logger: false });

  const sendGroupMsg = async (groupId: string, message: string): Promise<void> => {
    const url = `${cfg.apiBase.replace(/\/$/, '')}/send_group_msg`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiAccessToken) {
      headers.Authorization = `Bearer ${cfg.apiAccessToken}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ group_id: Number(groupId) || groupId, message }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OneBot send_group_msg HTTP ${res.status}: ${body}`);
    }
    log.debug({ groupId }, 'sent group msg');
  };

  app.post('/', async (req, reply) => {
    // Optional access token check (query or header)
    if (cfg.accessToken) {
      const auth = (req.headers.authorization || '') as string;
      const token =
        auth.replace(/^Bearer\s+/i, '') ||
        (req.headers['x-self-id'] as string) || // some impls differ
        (req.query as { access_token?: string }).access_token;
      // Also check common OneBot reverse HTTP token header
      const headerToken = (req.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');
      const q = req.query as { access_token?: string };
      const provided = headerToken || q.access_token || '';
      if (provided && provided !== cfg.accessToken) {
        return reply.code(401).send({ error: 'unauthorized' });
      }
      // If token configured but not provided, still accept (many setups put token only on API side)
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

    // Quick ACK for meta events
    if (event.post_type === 'meta_event') {
      return reply.send({ status: 'ok' });
    }

    if (event.post_type === 'message' && event.message_type === 'group') {
      const groupId = String(event.group_id ?? '');
      const userId = String(event.user_id ?? '');
      let text = event.raw_message ?? '';
      if (!text && typeof event.message === 'string') text = event.message;
      if (!text && Array.isArray(event.message)) {
        text = event.message
          .filter((s) => s.type === 'text')
          .map((s) => s.data?.text ?? '')
          .join('');
      }
      text = text.trim();
      if (text) {
        // Don't await long API calls before ACK — fire and forget with catch
        dispatch({
          platform: 'onebot',
          groupId,
          userId,
          text,
          reply: async (msg) => {
            await sendGroupMsg(groupId, msg);
          },
        }).catch((err) => log.error({ err }, 'dispatch error'));
      }
    }

    return reply.send({ status: 'ok' });
  });

  // Health
  app.get('/health', async () => ({ ok: true }));

  await app.listen({ host: cfg.host, port: cfg.port });
  log.info({ host: cfg.host, port: cfg.port }, 'OneBot HTTP receiver listening');

  return {
    sendGroupMsg,
    close: async () => {
      await app.close();
    },
  };
}
