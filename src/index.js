import { getUI } from './ui.js';

const WINDOW_MS = 4000;
const COOLDOWN_MS = 5000;
const MESSAGE_LIMIT = 7;

export function checkRate(previous, now) {
  const rate = previous || { times: [], until: 0 };
  if (rate.until > now) return { allowed: false, rate };
  const times = rate.times.filter(time => now - time < WINDOW_MS);
  times.push(now);
  const until = times.length >= MESSAGE_LIMIT ? now + COOLDOWN_MS : 0;
  return { allowed: true, rate: { times: until ? [] : times, until, lastSeen: now } };
}

export class ChatRoom {
  constructor(state, env) { this.state = state; }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ clientId: request.headers.get('X-Nova-Client') || crypto.randomUUID() });
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    // Bound work before parsing. Validate names and chat text independently.
    if (typeof message !== 'string' || message.length > 8192) return;
    let data;
    try { data = JSON.parse(message); } catch { return; }
    if (!data || typeof data !== 'object') return;
    if (data.type === 'init') {
      this.broadcastPresence();
      const rate = await this.state.storage.get('rate:' + this.clientId(ws));
      if (rate?.until > Date.now()) this.sendTimeout(ws, rate.until);
      return;
    }
    if (data.type !== 'chat' && data.type !== undefined) return;
    if (typeof data.user !== 'string' || typeof data.text !== 'string') return;
    const user = data.user.trim();
    const text = data.text.trim();
    if (!user || user.length > 20 || !text || text.length > 2000) {
      this.send(ws, { type: 'error', text: 'Use a name of 1–20 characters and a message of 1–2,000 characters.' });
      return;
    }
    // Browser identity survives refresh/name changes, without grouping school IPs.
    // Serialize across tabs and persist through Durable Object hibernation.
    await this.state.blockConcurrencyWhile(async () => {
      const clientId = this.clientId(ws);
      const key = 'rate:' + clientId;
      const result = checkRate(await this.state.storage.get(key), Date.now());
      if (!result.allowed) { this.sendTimeout(ws, result.rate.until, text); return; }
      await this.state.storage.put(key, result.rate);
      if (await this.state.storage.getAlarm() === null) await this.state.storage.setAlarm(Date.now() + 60000);
      this.broadcast({ type: 'chat', user, text, timestamp: Date.now() }, ws);
      if (result.rate.until) {
        for (const socket of this.state.getWebSockets()) {
          if (this.clientId(socket) === clientId) this.sendTimeout(socket, result.rate.until);
        }
      }
    });
  }

  clientId(ws) {
    let attachment = ws.deserializeAttachment();
    if (!attachment?.clientId) {
      attachment = { clientId: crypto.randomUUID() };
      ws.serializeAttachment(attachment);
    }
    return attachment.clientId;
  }

  async alarm() {
    const rates = await this.state.storage.list({ prefix: 'rate:' });
    const now = Date.now();
    const stale = [];
    for (const [key, rate] of rates) {
      if (Math.max(rate.until, rate.lastSeen + WINDOW_MS) <= now) stale.push(key);
    }
    for (let i = 0; i < stale.length; i += 128) await this.state.storage.delete(stale.slice(i, i + 128));
    if (rates.size > stale.length) await this.state.storage.setAlarm(now + 60000);
  }

  send(ws, data) {
    try { ws.send(JSON.stringify(data)); } catch { /* A disconnected peer must not stop the room. */ }
  }
  sendTimeout(ws, until, rejectedText) {
    this.send(ws, { type: 'timeout', retryAfterMs: Math.max(0, until - Date.now()), rejectedText });
  }
  broadcast(data, sender) {
    for (const socket of this.state.getWebSockets()) {
      this.send(socket, data.type === 'chat' ? { ...data, own: socket === sender } : data);
    }
  }
  webSocketClose(ws, code) {
    try { ws.close(code === 1006 ? 1000 : code); } catch { /* Already closed. */ }
    this.broadcastPresence(ws);
  }
  webSocketError(ws) {
    try { ws.close(1011, 'Connection error'); } catch { /* Already closed. */ }
    this.broadcastPresence(ws);
  }
  broadcastPresence(excluded) {
    const sockets = this.state.getWebSockets().filter(socket => socket !== excluded);
    for (const socket of sockets) this.send(socket, { type: 'presence', count: sockets.length });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cookie = request.headers.get('Cookie') || '';
    const existing = cookie.match(/(?:^|;\s*)nova_client=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const clientId = existing || crypto.randomUUID();
    if (url.pathname === '/ws') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return new Response('Forbidden', { status: 403 });
      const headers = new Headers(request.headers);
      headers.set('X-Nova-Client', clientId);
      const room = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName('global'));
      return room.fetch(new Request(request, { headers }));
    }
    const headers = new Headers({ 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' });
    if (!existing) headers.set('Set-Cookie', 'nova_client=' + clientId + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000' + (url.protocol === 'https:' ? '; Secure' : ''));
    return new Response(getUI(), { headers });
  },
};
