import { getUI } from './ui.js';

const WINDOW_MS = 4000;
const COOLDOWN_MS = 5000;
const MESSAGE_LIMIT = 7;

// The UI is bundled into Nova Gaming, while this worker remains the chat backend.
function isTrustedNovaOrigin(origin, workerOrigin, env) {
  if (!origin || origin === workerOrigin) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
  if (hostname === 'umarerth.pages.dev' || hostname === 'umarerth.github.io') return true;
  if (hostname === 'static.app' || hostname.endsWith('.static.app')) return true;
  const configured = String(env.NOVA_CLIENT_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  return configured.includes(origin);
}

// Public routing IDs must never reveal the browser's identity cookie.
export async function peerIdFor(clientId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nova-peer:' + clientId));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

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
    const clientId = request.headers.get('X-Nova-Client') || crypto.randomUUID();
    server.serializeAttachment({ clientId, peerId: await peerIdFor(clientId) });
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    // Bound work before parsing. Validate names and chat text independently.
    if (typeof message !== 'string' || message.length > 8192) return;
    let data;
    try { data = JSON.parse(message); } catch { return; }
    if (!data || typeof data !== 'object') return;
    await this.ensurePeer(ws);
    if (data.type === 'init' || data.type === 'profile') {
      if (data.user !== undefined) {
        if (typeof data.user !== 'string' || !data.user.trim() || data.user.trim().length > 20) {
          this.send(ws, { type: 'error', text: 'Choose a name of 1–20 characters.' });
          return;
        }
        this.setName(ws, data.user.trim());
      }
      this.send(ws, { type: 'session', peerId: ws.deserializeAttachment().peerId });
      this.broadcastPresence();
      const rate = await this.state.storage.get('rate:' + this.clientId(ws));
      if (rate?.until > Date.now()) this.sendTimeout(ws, rate.until);
      return;
    }
    if (data.type !== 'chat' && data.type !== 'dm' && data.type !== undefined) return;
    if (typeof data.text !== 'string') return;
    const profile = ws.deserializeAttachment();
    const suppliedName = typeof data.user === 'string' ? data.user.trim() : '';
    const user = profile.user || suppliedName;
    const text = data.text.trim();
    const to = data.type === 'dm' && typeof data.to === 'string' ? data.to : null;
    if (!user || user.length > 20 || !text || text.length > 2000) {
      this.send(ws, { type: 'error', text: 'Use a name of 1–20 characters and a message of 1–2,000 characters.' });
      return;
    }
    if (data.type === 'dm' && (!profile.user || !to || to.length !== 64 || to === profile.peerId)) {
      this.send(ws, { type: 'error', text: 'Choose someone online to start a direct message.', rejectedText: text, to });
      return;
    }
    // Older clients may still provide their name on their first public message.
    if (!profile.user) { this.setName(ws, user); this.broadcastPresence(); }
    // Browser identity survives refresh/name changes, without grouping school IPs.
    // Serialize across tabs and persist through Durable Object hibernation.
    await this.state.blockConcurrencyWhile(async () => {
      const clientId = this.clientId(ws);
      const sender = ws.deserializeAttachment();
      const recipients = to ? this.state.getWebSockets().filter(socket => {
        const peer = socket.deserializeAttachment();
        return peer?.peerId === to && peer.user && (socket.readyState === undefined || socket.readyState === 1);
      }) : [];
      if (to && !recipients.length) {
        this.send(ws, { type: 'error', text: 'That person is offline. Your message was not sent.', rejectedText: text, to });
        return;
      }
      const key = 'rate:' + clientId;
      const result = checkRate(await this.state.storage.get(key), Date.now());
      if (!result.allowed) { this.sendTimeout(ws, result.rate.until, text, to); return; }
      await this.state.storage.put(key, result.rate);
      if (await this.state.storage.getAlarm() === null) await this.state.storage.setAlarm(Date.now() + 60000);
      if (to) {
        const payload = { type: 'dm', from: sender.peerId, to, user: sender.user, recipient: recipients[0].deserializeAttachment().user, text, timestamp: Date.now() };
        // Deliberately never broadcast DMs: only the recipient and sender's tabs.
        for (const socket of this.state.getWebSockets()) {
          if (recipients.includes(socket) || this.clientId(socket) === clientId) {
            this.send(socket, { ...payload, own: this.clientId(socket) === clientId });
          }
        }
      } else {
        this.broadcast({ type: 'chat', user: sender.user, from: sender.peerId, text, timestamp: Date.now() }, ws);
      }
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

  async ensurePeer(ws) {
    const clientId = this.clientId(ws);
    const profile = ws.deserializeAttachment();
    if (!profile.peerId) ws.serializeAttachment({ ...profile, peerId: await peerIdFor(clientId) });
  }

  setName(ws, user) {
    const profile = ws.deserializeAttachment();
    for (const socket of this.state.getWebSockets()) {
      if (this.clientId(socket) === profile.clientId) socket.serializeAttachment({ ...profile, user });
    }
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
  sendTimeout(ws, until, rejectedText, to) {
    this.send(ws, { type: 'timeout', retryAfterMs: Math.max(0, until - Date.now()), rejectedText, to });
  }
  broadcast(data, sender) {
    for (const socket of this.state.getWebSockets()) {
      this.send(socket, data.type === 'chat' ? { ...data, own: this.clientId(socket) === this.clientId(sender) } : data);
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
    const peers = new Map();
    for (const socket of sockets) {
      const profile = socket.deserializeAttachment();
      if (profile?.peerId && profile.user) peers.set(profile.peerId, { id: profile.peerId, user: profile.user });
    }
    for (const socket of sockets) this.send(socket, { type: 'presence', count: peers.size, users: [...peers.values()] });
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
      if (!isTrustedNovaOrigin(origin, url.origin, env)) return new Response('Forbidden', { status: 403 });
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
