import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker, { ChatRoom, checkRate, peerIdFor } from '../src/index.js';
import nestedWorker, { ChatRoom as NestedRoom } from '../global-chat/src/index.js';

test('the seventh message in four seconds is delivered and starts a five-second timeout', () => {
  let rate;
  for (let i = 0; i < 7; i++) {
    const result = checkRate(rate, 10000 + i * 100);
    assert.equal(result.allowed, true);
    rate = result.rate;
    assert.equal(rate.until, i === 6 ? 15600 : 0);
  }
  assert.equal(checkRate(rate, 15600 - 1).allowed, false);
  assert.equal(checkRate(rate, 15600).allowed, true);
  assert.equal(checkRate(rate, 15600).rate.until, 0);
});

test('rolling window expires old messages and blocked attempts do not extend timeout', () => {
  const rate = { times: [1000, 1100, 1200, 1300, 1400, 1500], until: 0 };
  assert.equal(checkRate(rate, 5000).rate.until, 0);
  const blocked = { times: [], until: 7000 };
  assert.deepEqual(checkRate(blocked, 6000), { allowed: false, rate: blocked });
});

function fixture() {
  const data = new Map();
  let alarm = null;
  const socket = id => ({
    attachment: { clientId: id }, sent: [],
    send(value) { this.sent.push(JSON.parse(value)); },
    deserializeAttachment() { return this.attachment; },
    serializeAttachment(value) { this.attachment = value; },
  });
  const one = socket('one'), sameBrowser = socket('one'), other = socket('other');
  const sockets = [one, sameBrowser, other];
  const state = {
    getWebSockets: () => sockets,
    blockConcurrencyWhile: callback => callback(),
    storage: {
      get: async key => structuredClone(data.get(key)),
      put: async (key, value) => data.set(key, structuredClone(value)),
      getAlarm: async () => alarm,
      setAlarm: async value => { alarm = value; },
      list: async () => new Map(data),
      delete: async keys => keys.forEach(key => data.delete(key)),
    },
  };
  return { state, data, socket, sockets, one, sameBrowser, other, room: new ChatRoom(state) };
}

test('server blocks spam across names, tabs, reconnections and object hibernation', async () => {
  const f = fixture();
  const send = (room, socket, user = 'Nova') => room.webSocketMessage(socket, JSON.stringify({ type: 'chat', user, text: 'hello' }));
  for (let i = 0; i < 7; i++) await send(f.room, i % 2 ? f.sameBrowser : f.one);
  assert.equal(f.other.sent.filter(x => x.type === 'chat').length, 7);
  assert.equal(f.one.sent.at(-1).type, 'timeout');
  assert.equal(f.sameBrowser.sent.at(-1).type, 'timeout');
  const resumed = new ChatRoom(f.state);
  await resumed.webSocketMessage(f.sameBrowser, JSON.stringify({ type: 'init' }));
  assert.equal(f.sameBrowser.sent.at(-1).type, 'timeout');
  await send(resumed, f.one, 'Changed name');
  assert.equal(f.one.sent.at(-1).rejectedText, 'hello');
  assert.equal(f.other.sent.filter(x => x.type === 'chat').length, 7);
  await send(resumed, f.other);
  assert.equal(f.other.sent.filter(x => x.type === 'chat').length, 8);
});

test('malformed, binary, oversized, empty and invalid messages never broadcast', async () => {
  const f = fixture();
  for (const message of ['{', 'null', '3', new ArrayBuffer(10), 'x'.repeat(9000), ...[
    { user: {}, text: 'hello' }, { user: 'a', text: [] }, { user: ' ', text: 'hello' },
    { user: 'a', text: ' ' }, { user: 'a'.repeat(21), text: 'hello' },
    { user: 'a', text: 'x'.repeat(2001) }, { type: 'unknown', user: 'a', text: 'hello' },
  ].map(JSON.stringify)]) await f.room.webSocketMessage(f.one, message);
  assert.equal(f.other.sent.length, 0);
  await f.room.webSocketMessage(f.one, JSON.stringify({ user: ' Nova ', text: '<script>alert(1)</script>' }));
  const delivered = f.other.sent.find(item => item.type === 'chat');
  assert.equal(delivered.user, 'Nova');
  assert.equal(delivered.text, '<script>alert(1)</script>');
});

async function register(f, socket, user) {
  await f.room.webSocketMessage(socket, JSON.stringify({ type: 'init', user }));
  return socket.deserializeAttachment().peerId;
}

test('online roster deduplicates tabs and exposes public routing IDs, never identity cookies', async () => {
  const f = fixture();
  const id = await register(f, f.one, 'Alex');
  const otherId = await register(f, f.other, 'Alex');
  const roster = f.other.sent.filter(item => item.type === 'presence').at(-1);
  assert.equal(roster.count, 2);
  assert.equal(roster.users.length, 2);
  assert.notEqual(id, otherId);
  assert.equal(id, await peerIdFor('one'));
  assert.match(id, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(roster.users[0]).sort(), ['id', 'user']);
  assert.equal(JSON.stringify(f.one.sent).includes('clientId'), false);
});

test('DMs reach only the recipient and sender tabs, including after hibernation', async () => {
  const f = fixture();
  const senderId = await register(f, f.one, 'Alex');
  const recipientId = await register(f, f.other, 'Alex');
  const observer = f.socket('observer'); f.sockets.push(observer);
  await register(f, observer, 'Observer');
  f.room = new ChatRoom(f.state);
  const packet = { type: 'dm', to: recipientId, text: 'private hello', user: 'Spoofed', from: recipientId, own: true };
  await f.room.webSocketMessage(f.one, JSON.stringify(packet));
  for (const socket of [f.one, f.sameBrowser, f.other]) {
    const dm = socket.sent.filter(item => item.type === 'dm').at(-1);
    assert.equal(dm.text, 'private hello');
    assert.equal(dm.from, senderId);
    assert.equal(dm.to, recipientId);
    assert.equal(dm.user, 'Alex');
    assert.equal(dm.own, socket !== f.other);
  }
  assert.equal(observer.sent.some(item => item.type === 'dm'), false);
  assert.equal(f.sockets.some(socket => socket.sent.some(item => item.type === 'chat')), false);
  await f.room.webSocketMessage(f.other, JSON.stringify({ type: 'dm', to: senderId, text: 'private reply' }));
  assert.equal(f.one.sent.at(-1).text, 'private reply');
  assert.equal(observer.sent.some(item => item.type === 'dm'), false);
});

test('renaming preserves DM routing and updates the online roster', async () => {
  const f = fixture();
  const id = await register(f, f.one, 'Before');
  await register(f, f.other, 'Friend');
  await f.room.webSocketMessage(f.one, JSON.stringify({ type: 'profile', user: 'After' }));
  assert.equal(f.sameBrowser.deserializeAttachment().user, 'After');
  assert.equal(f.one.deserializeAttachment().peerId, id);
  await f.room.webSocketMessage(f.other, JSON.stringify({ type: 'dm', to: id, text: 'same conversation' }));
  assert.equal(f.one.sent.at(-1).recipient, 'After');
  assert.equal(f.one.sent.at(-1).text, 'same conversation');
});

test('public messages and DMs share one cooldown, with rejected drafts routed to their conversation', async () => {
  const f = fixture();
  await register(f, f.one, 'Sender');
  const id = await register(f, f.other, 'Recipient');
  for (let i = 0; i < 6; i++) await f.room.webSocketMessage(f.one, JSON.stringify({ type: 'chat', text: 'public' }));
  await f.room.webSocketMessage(f.one, JSON.stringify({ type: 'dm', to: id, text: 'seventh' }));
  assert.equal(f.other.sent.filter(item => item.type === 'dm').length, 1);
  assert.equal(f.one.sent.at(-1).type, 'timeout');
  await f.room.webSocketMessage(f.sameBrowser, JSON.stringify({ type: 'dm', to: id, text: 'blocked draft' }));
  assert.equal(f.sameBrowser.sent.at(-1).to, id);
  assert.equal(f.sameBrowser.sent.at(-1).rejectedText, 'blocked draft');
  await f.room.webSocketMessage(f.one, JSON.stringify({ type: 'chat', text: 'also blocked' }));
  assert.equal(f.other.sent.filter(item => item.type === 'chat').length, 6);
});

test('offline, self and unregistered DM targets cannot receive or broadcast messages', async () => {
  const f = fixture();
  const id = await register(f, f.one, 'Sender');
  const otherId = await register(f, f.other, 'Recipient');
  f.sockets.splice(f.sockets.indexOf(f.other), 1);
  for (const to of [otherId, id, 'bad-id', '0'.repeat(64)]) {
    await f.room.webSocketMessage(f.one, JSON.stringify({ type: 'dm', to, text: 'never delivered' }));
    assert.equal(f.one.sent.at(-1).type, 'error');
  }
  const anonymous = f.socket('anon'); f.sockets.push(anonymous);
  await f.room.webSocketMessage(anonymous, JSON.stringify({ type: 'dm', to: id, user: 'Forged', text: 'not registered' }));
  assert.equal(anonymous.sent.at(-1).type, 'error');
  assert.equal(f.sockets.some(socket => socket.sent.some(item => item.type === 'dm')), false);
  assert.equal(f.data.size, 0);
});

test('stale rate records are cleaned up', async () => {
  const f = fixture();
  f.data.set('rate:old', { times: [], until: 0, lastSeen: 0 });
  f.data.set('rate:active', { times: [], until: Date.now() + 5000, lastSeen: Date.now() });
  await f.room.alarm();
  assert.equal(f.data.has('rate:old'), false);
  assert.equal(f.data.has('rate:active'), true);
});

test('both entry points serve the same valid UI and browser identity cookie', async () => {
  assert.equal(nestedWorker, worker);
  assert.equal(NestedRoom, ChatRoom);
  const response = await worker.fetch(new Request('https://nova.test/'), {});
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict;.*Secure/);
  const html = await response.text();
  assert.match(html, /What do you want to be called in chat/);
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  const repeat = await worker.fetch(new Request('https://nova.test/', { headers: { Cookie: response.headers.get('set-cookie').split(';')[0] } }), {});
  assert.equal(repeat.headers.get('set-cookie'), null);
  const forbidden = await worker.fetch(new Request('https://nova.test/ws', { headers: { Origin: 'https://other.test' } }), {});
  assert.equal(forbidden.status, 403);
});
