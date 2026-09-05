export function getUI() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#101e29">
<title>Nova Chat · Your little corner of the internet</title>
<style>
  :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #edf7fa; background: #0b1720; font-synthesis: none; }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; height: 100dvh; padding: 28px; background: radial-gradient(ellipse at 0% 0%, #234e58 0, transparent 52%), radial-gradient(ellipse at 100% 100%, #333c65 0, transparent 55%), #0b1720; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  button, input { -webkit-tap-highlight-color: transparent; }
  button:focus-visible, input:focus-visible, [tabindex]:focus-visible { outline: 2px solid #a7f9df; outline-offset: 4px; }
  button:disabled { cursor: default; opacity: .45; }
  [hidden] { display: none !important; }
  .glass { background: linear-gradient(135deg, #ffffff12, #ffffff03 65%); border: 1px solid #ffffff20; box-shadow: inset 0 1px 0 #ffffff1c, 0 12px 36px #00000016; }
  .app { max-width: 1440px; height: 100%; margin: auto; border-radius: 26px; overflow: hidden; display: grid; grid-template-columns: 242px minmax(0, 1fr); background-color: #101e29bb; }
  .sidebar { padding: 30px 20px 22px; border-right: 1px solid #ffffff12; display: flex; flex-direction: column; gap: 32px; background: linear-gradient(150deg, #ffffff06, transparent); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 42px; height: 42px; border-radius: 15px; display: grid; place-items: center; color: #c5ffed; background: linear-gradient(140deg, #bcffe53b, #73c8ff10); border: 1px solid #caffed5c; box-shadow: inset 0 2px 3px #ffffff30; flex-shrink: 0; }
  .logo svg { width: 25px; height: 25px; }
  .brand-name { font-size: 21px; font-weight: 650; letter-spacing: -.8px; }
  .brand-name span { color: #a6c1cb; font-weight: 400; }
  .eyebrow { font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 650; color: #9cb6c1; }
  .room { margin-top: 12px; border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 12px; background: linear-gradient(120deg, #adfce322, #8bc6f40a); border-color: #bdf7ea38; }
  .hash { font-size: 26px; color: #baf7e4; font-weight: 300; }
  .room strong { display: block; font-size: 13px; font-weight: 600; }
  .room small { display: block; color: #9ebac5; font-size: 11px; margin-top: 4px; }
  .room-dot, .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #9ceacb; flex-shrink: 0; }
  .room-dot { margin-left: auto; }
  .side-note { margin-top: auto; padding: 17px; border-radius: 16px; }
  .side-note svg { width: 21px; height: 21px; color: #b8eddd; }
  .side-note strong { display: block; margin: 10px 0 6px; font-size: 12px; }
  .side-note p { margin: 0; color: #adc0c9; font-size: 12px; line-height: 1.7; }
  .profile { display: flex; gap: 10px; align-items: center; min-width: 0; }
  .avatar { width: 35px; height: 35px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(145deg, #addac732, #a4bcfa20); border: 1px solid #ffffff26; color: #d4f4e9; font-size: 13px; flex-shrink: 0; }
  .profile div:last-child { min-width: 0; }
  #profile-name { display: block; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
  .profile small { color: #a6bdc5; font-size: 10px; }
  main { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
  header { display: flex; align-items: center; gap: 14px; padding: 25px 32px; border-bottom: 1px solid #ffffff12; flex-shrink: 0; }
  header h1 { font-size: 17px; letter-spacing: -.4px; font-weight: 600; margin: 0 0 4px; }
  header p { font-size: 11px; color: #a6bdc5; margin: 0; }
  .header-title { flex: 1; }
  .status { display: flex; align-items: center; gap: 7px; color: #c9e5de; border-radius: 24px; padding: 8px 12px; font-size: 11px; background: #b5e7d80a; white-space: nowrap; }
  .status.offline .status-dot { background: #b1bbc5; }
  .icon-btn { width: 40px; height: 40px; border-radius: 13px; color: #d9e8ed; display: grid; place-items: center; flex-shrink: 0; }
  .icon-btn:hover { background-color: #ffffff12; }
  svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  #chat { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 26px 32px; scrollbar-width: thin; scrollbar-color: #ffffff25 transparent; }
  .welcome { max-width: 420px; margin: clamp(22px, 8vh, 85px) auto 34px; text-align: center; }
  .welcome .logo { width: 66px; height: 66px; border-radius: 23px; margin: 0 auto 23px; }
  .welcome .logo svg { width: 34px; height: 34px; }
  .welcome .eyebrow { color: #b6dacd; }
  .welcome h2 { font-size: clamp(25px, 3vw, 36px); font-weight: 500; letter-spacing: -1.3px; margin: 12px 0; }
  .welcome p { color: #afc3cc; font-size: 13px; line-height: 1.8; margin: 0 auto; max-width: 310px; }
  .welcome-tag { display: inline-flex; gap: 7px; align-items: center; font-size: 10px; color: #b8d2cb; border-radius: 30px; padding: 8px 12px; margin-top: 21px; }
  .welcome.started { margin: 0 auto 22px; }
  .welcome.started h2 { font-size: 20px; letter-spacing: -.5px; }
  .welcome.started .logo, .welcome.started .eyebrow, .welcome.started p, .welcome.started .welcome-tag { display: none; }
  .day-label { display: flex; align-items: center; gap: 15px; color: #9bb4bf; font-size: 10px; margin: 14px 0 24px; }
  .day-label:before, .day-label:after { content: ''; flex: 1; height: 1px; background: #ffffff10; }
  .message-row { display: flex; gap: 10px; margin: 0 0 18px; contain: layout style; }
  .message-row.own { flex-direction: row-reverse; }
  .message-content { max-width: min(78%, 600px); min-width: 0; }
  .message-meta { display: flex; align-items: baseline; gap: 9px; margin: 0 2px 6px; }
  .own .message-meta { justify-content: flex-end; }
  .sender { font-size: 11px; font-weight: 600; overflow-wrap: anywhere; }
  time { font-size: 9px; color: #9ab1bd; white-space: nowrap; }
  .bubble { padding: 12px 16px; font-size: 13px; line-height: 1.65; border-radius: 4px 17px 17px; border: 1px solid #ffffff1c; background: linear-gradient(125deg, #ffffff0f, #ffffff05); box-shadow: inset 0 1px 0 #ffffff0b; white-space: pre-wrap; overflow-wrap: anywhere; }
  .own .bubble { border-radius: 17px 4px 17px 17px; background: linear-gradient(125deg, #9fffd323, #8cd6f414); border-color: #b2f4db30; color: #e0fbf2; }
  footer { padding: 0 32px 22px; flex-shrink: 0; }
  #notice { min-height: 27px; margin: 0; padding: 3px 2px 8px; color: #b6cdd5; font-size: 11px; }
  #notice.cooldown { color: #ffe1a3; }
  .composer { display: flex; align-items: center; gap: 12px; padding: 8px 9px 8px 17px; border-radius: 18px; background: linear-gradient(135deg, #ffffff0e, #ffffff04); }
  #message { flex: 1; width: 0; border: 0; background: transparent; color: #edf7fa; padding: 12px 0; font-size: 13px; outline-offset: 1px; }
  input::placeholder { color: #9eb5c0; }
  .primary { border: 1px solid #d8fff67a; background: linear-gradient(140deg, #cbf7e6, #91d6cd); color: #153630; border-radius: 12px; padding: 12px 18px; font-weight: 650; font-size: 12px; box-shadow: inset 0 1px 1px #ffffffcc, 0 3px 10px #00000015; }
  .primary:hover:not(:disabled) { background: #d1faed; }
  #send { display: flex; gap: 9px; align-items: center; }
  .composer-hint { display: flex; justify-content: space-between; gap: 12px; margin-top: 11px; color: #94acb8; font-size: 10px; }
  .composer-hint span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .overlay { position: fixed; inset: 0; background: #071019cc; z-index: 20; display: grid; place-items: center; padding: 20px; overflow-y: auto; }
  .dialog { width: 100%; max-width: 420px; padding: 32px; border-radius: 26px; background: radial-gradient(ellipse at top left, #36565c, transparent 80%), linear-gradient(130deg, #233540, #192535); border: 1px solid #c8f3ec42; box-shadow: inset 0 1px 0 #ffffff35, 0 28px 90px #00000055; }
  .dialog .logo { margin-bottom: 24px; }
  .dialog h2 { font-size: 26px; font-weight: 500; line-height: 1.25; letter-spacing: -.8px; margin: 10px 0 12px; }
  .dialog p { font-size: 13px; color: #bfd1d7; line-height: 1.7; margin: 0 0 25px; }
  .dialog label { font-size: 12px; display: block; margin: 0 0 9px; }
  #name { width: 100%; border: 1px solid #d3f9f344; background: #081a244d; border-radius: 13px; padding: 14px; color: #fff; }
  #name-error { font-size: 11px; color: #ffd4ab; min-height: 26px; padding-top: 7px; }
  .dialog-actions { display: flex; gap: 10px; margin-top: 8px; }
  .dialog-actions .primary { flex: 1; padding: 14px; }
  #cancel { color: #d5e7ed; border-radius: 12px; padding: 12px 18px; }
  .dialog .privacy { font-size: 10px; text-align: center; margin: 17px 0 0; color: #a6c0c9; }
  @media (max-width: 900px) { body { padding: 14px; } .app { grid-template-columns: 205px minmax(0, 1fr); } header { padding: 22px; } #chat { padding: 22px; } footer { padding: 0 22px 18px; } }
  @media (max-width: 680px) { body { padding: 0; } .app { border: 0; border-radius: 0; grid-template-columns: minmax(0, 1fr); } .sidebar { display: none; } header { padding: 18px 16px; gap: 10px; } header > .hash { display: none; } header h1 { font-size: 16px; } .status { padding: 8px; font-size: 10px; } #chat { padding: 18px 16px; } footer { padding: 0 16px max(16px, env(safe-area-inset-bottom)); } .composer-hint span:last-child { display: none; } #send { padding: 12px; } #send span { display: none; } .dialog { padding: 27px; } .message-content { max-width: 83%; } }
  @media (max-height: 520px) { .welcome { margin: 10px auto 20px; } .welcome .logo, .welcome-tag { display: none; } .dialog { padding: 20px; } .dialog .logo { display: none; } .dialog p { margin-bottom: 14px; } }
  @media (prefers-reduced-transparency: reduce) { .app { background-color: #182b37; } .bubble, .composer, .room { background-color: #263c48; } }
  @media (forced-colors: active) { .glass, .bubble, .dialog, .primary, #name { border: 1px solid ButtonText; } }
</style>
</head>
<body>
<div class="app glass" id="app">
  <aside class="sidebar" aria-label="Chat room">
    <div class="brand"><div class="logo">${novaIcon()}</div><div class="brand-name">nova<span>chat</span></div></div>
    <div><div class="eyebrow">Your spaces</div><div class="room glass" aria-current="page"><span class="hash">#</span><div><strong>Global lounge</strong><small>A place for everyone</small></div><span class="room-dot"></span></div></div>
    <div class="side-note glass"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 3v6c0 5-7 9-7 9s-7-4-7-9V6z"/><path d="m8 12 3 3 5-6"/></svg><strong>Good chats start with you.</strong><p>Be kind. Make a friend.<br>Give everyone room to talk.</p></div>
    <div class="profile"><div class="avatar" id="profile-avatar">?</div><div><strong id="profile-name">Your name goes here</strong><small>Your corner of the internet</small></div></div>
  </aside>
  <main>
    <header><span class="hash" aria-hidden="true">#</span><div class="header-title"><h1>Global lounge</h1><p>Different people. One conversation.</p></div><div class="status glass offline" id="status"><span class="status-dot"></span><span id="user-count">Connecting…</span></div><button class="icon-btn glass" id="settings" aria-label="Settings" title="Settings · change your name"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-.6 2.2-2 .9-2-.6-2 3.5L4 10.5v3l-1.6 1.6 2 3.5 2-.6 2 .9L9 21h4l.6-2.1 2-.9 2 .6 2-3.5-1.6-1.6v-3L19.6 9l-2-3.5-2 .6-2-.9L13 3z"/><circle cx="11" cy="12" r="3"/></svg></button></header>
    <section id="chat" role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions" tabindex="0">
      <div class="welcome" id="welcome"><div class="logo">${novaIcon()}</div><div class="eyebrow">A little space to connect</div><h2>Good company. Great chats.</h2><p>Drop a thought, share a moment, or just say hey. The lounge is yours.</p><div class="welcome-tag glass"><span class="status-dot"></span>Live, in the moment</div></div>
      <div class="day-label">This conversation starts here</div><div id="messages"></div>
    </section>
    <footer><p id="notice" role="status" aria-live="polite"></p><form class="composer glass" id="composer"><input id="message" aria-label="Message" placeholder="Say something nice…" maxlength="2000" autocomplete="off" disabled><button class="primary" id="send" type="submit" disabled><span>Send</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-4 14-3-6-7-1Z"/><path d="m12 13 7-8"/></svg></button></form><div class="composer-hint"><span id="chatting-as">Choose a name to join in</span><span>Enter to send · A little kindness goes a long way</span></div></footer>
  </main>
</div>
<div class="overlay" id="name-overlay" hidden><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="name-title" aria-describedby="name-description"><div class="logo">${novaIcon()}</div><div class="eyebrow" id="dialog-eyebrow">Welcome to Nova Chat</div><h2 id="name-title">What do you want to be called in chat?</h2><p id="name-description">Pick a name that feels like you. You can change it anytime in settings.</p><form id="name-form"><label for="name">Your chat name</label><input id="name" placeholder="e.g. Moonwalker" maxlength="20" autocomplete="nickname" required aria-describedby="name-error"><div id="name-error" role="alert"></div><div class="dialog-actions"><button id="cancel" class="glass" type="button" hidden>Cancel</button><button class="primary" id="save-name" type="submit">Let’s chat <span aria-hidden="true">↗</span></button></div></form><p class="privacy">Your name is saved on this browser.</p></section></div>
<script>${clientScript}</script>
</body></html>`;
}

function novaIcon() {
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 3.3 9.7L29 16l-9.7 3.3L16 29l-3.3-9.7L3 16l9.7-3.3Z"/><path d="m23 3 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></svg>';
}

// Keep browser code as source text so Worker bundling cannot inject server helpers.
const clientScript = String.raw`(function startChat() {
  const $ = id => document.getElementById(id);
  const app = $('app'), overlay = $('name-overlay'), nameInput = $('name');
  const message = $('message'), send = $('send'), notice = $('notice');
  const chat = $('chat'), messages = $('messages');
  const NAME_KEY = 'nova.chat.name.v1';
  const TIMEOUT_KEY = 'nova.chat.timeout.v1';
  function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch { /* Session still works when storage is unavailable. */ } }
  let name = (read(NAME_KEY) || '').trim().slice(0, 20);
  let until = Math.min(Number(read(TIMEOUT_KEY)) || 0, Date.now() + 5000);
  let ws, connected = false, timer, reconnectTimer, retries = 0, editing = false;
  let sentTimes = [];
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

  function updateProfile() {
    $('profile-name').textContent = name || 'Your name goes here';
    $('profile-avatar').textContent = name ? Array.from(name)[0].toUpperCase() : '?';
    $('chatting-as').textContent = name ? 'Chatting as ' + name : 'Choose a name to join in';
  }
  function updateControls() {
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    message.disabled = !name || !connected || !overlay.hidden || remaining > 0;
    send.disabled = message.disabled || !message.value.trim();
    notice.classList.toggle('cooldown', remaining > 0);
    if (remaining) notice.textContent = 'A quick breather — you can chat again in ' + remaining + 's.';
    else if (!connected) notice.textContent = 'Connecting to the lounge… Your draft will stay here.';
    else if (!name) notice.textContent = 'Choose your chat name to get started.';
    else notice.textContent = '';
    clearTimeout(timer);
    if (remaining) timer = setTimeout(updateControls, 200);
  }
  function setCooldown(milliseconds) {
    until = Math.max(until, Date.now() + milliseconds);
    save(TIMEOUT_KEY, String(until));
    updateControls();
  }
  function openName(isEditing) {
    editing = isEditing;
    nameInput.value = name;
    $('name-error').textContent = '';
    $('name-title').textContent = editing ? 'Make yourself at home.' : 'What do you want to be called in chat?';
    $('dialog-eyebrow').textContent = editing ? 'Your settings' : 'Welcome to Nova Chat';
    $('name-description').textContent = editing ? 'A new name, same you. Your next messages will use the name you choose.' : 'Pick a name that feels like you. You can change it anytime in settings.';
    $('save-name').textContent = editing ? 'Save name' : 'Let’s chat ↗';
    $('cancel').hidden = !editing;
    overlay.hidden = false;
    app.inert = true;
    app.setAttribute('aria-hidden', 'true');
    updateControls();
    nameInput.focus();
  }
  function closeName() {
    overlay.hidden = true;
    app.inert = false;
    app.removeAttribute('aria-hidden');
    updateControls();
    if (editing) $('settings').focus();
    else if (!message.disabled) message.focus();
  }
  $('settings').addEventListener('click', () => openName(Boolean(name)));
  $('cancel').addEventListener('click', closeName);
  $('name-form').addEventListener('submit', event => {
    event.preventDefault();
    const next = nameInput.value.trim();
    if (!next || next.length > 20) {
      $('name-error').textContent = 'Please choose a name of 1–20 characters.';
      nameInput.focus();
      return;
    }
    name = next;
    save(NAME_KEY, name);
    updateProfile();
    closeName();
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); if (editing) closeName(); }
    if (event.key === 'Tab') {
      const buttons = [nameInput, ...overlay.querySelectorAll('button:not([hidden])')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Focus containment also covers browsers predating the inert attribute.
  document.addEventListener('focusin', event => {
    if (!overlay.hidden && !overlay.contains(event.target)) nameInput.focus();
  });
  window.addEventListener('storage', event => {
    if (event.key === TIMEOUT_KEY) {
      until = Math.max(until, Math.min(Number(event.newValue) || 0, Date.now() + 5000));
      updateControls();
    }
    if (event.key === NAME_KEY && event.newValue?.trim()) {
      name = event.newValue.trim().slice(0, 20);
      updateProfile();
      updateControls();
    }
  });

  function appendMessage(data) {
    const nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
    $('welcome').classList.add('started');
    const row = document.createElement('article');
    row.className = 'message-row' + (data.own ? ' own' : '');
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = Array.from(data.user)[0]?.toUpperCase() || '?';
    const content = document.createElement('div');
    content.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const sender = document.createElement('span');
    sender.className = 'sender';
    sender.textContent = data.user + (data.own ? ' · you' : '');
    const time = document.createElement('time');
    const date = new Date(data.timestamp || Date.now());
    time.dateTime = date.toISOString();
    time.textContent = timeFormat.format(date);
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = data.text;
    meta.append(sender, time);
    content.append(meta, bubble);
    row.append(avatar, content);
    messages.appendChild(row);
    // Keep long-running rooms cheap on older devices; never blur each message.
    while (messages.children.length > 150) {
      const first = messages.firstElementChild;
      const height = first.getBoundingClientRect().height + 18;
      first.remove();
      if (!nearBottom) chat.scrollTop = Math.max(0, chat.scrollTop - height);
    }
    if (nearBottom || data.own) chat.scrollTop = chat.scrollHeight;
  }

  function connect() {
    clearTimeout(reconnectTimer);
    ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws');
    ws.onopen = () => {
      connected = true;
      retries = 0;
      $('status').classList.remove('offline');
      ws.send(JSON.stringify({ type: 'init' }));
      updateControls();
    };
    ws.onmessage = event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'presence') $('user-count').textContent = data.count + ' online';
      if (data.type === 'chat' && typeof data.user === 'string' && typeof data.text === 'string') appendMessage(data);
      if (data.type === 'timeout') {
        setCooldown(Math.min(5000, Math.max(0, Number(data.retryAfterMs) || 0)));
        if (data.rejectedText) {
          message.value = message.value ? data.rejectedText + ' ' + message.value : data.rejectedText;
          message.value = message.value.slice(0, 2000);
        }
      }
      if (data.type === 'error') notice.textContent = data.text;
    };
    ws.onclose = () => {
      connected = false;
      $('status').classList.add('offline');
      $('user-count').textContent = 'Reconnecting…';
      updateControls();
      reconnectTimer = setTimeout(connect, Math.min(1000 * Math.pow(2, retries++), 15000));
    };
    ws.onerror = () => ws.close();
  }
  message.addEventListener('input', () => { send.disabled = message.disabled || !message.value.trim(); });
  $('composer').addEventListener('submit', event => {
    event.preventDefault();
    const text = message.value.trim();
    if (!name || !text || !overlay.hidden || Date.now() < until || !connected || ws.readyState !== WebSocket.OPEN) return;
    try { ws.send(JSON.stringify({ type: 'chat', user: name, text })); }
    catch { notice.textContent = 'Couldn’t send. Your message is still here — try again when connected.'; return; }
    message.value = '';
    const now = Date.now();
    sentTimes = sentTimes.filter(time => now - time < 4000);
    sentTimes.push(now);
    if (sentTimes.length >= 7) { sentTimes = []; setCooldown(5000); }
    updateControls();
  });
  updateProfile();
  updateControls();
  if (!name) openName(false);
  connect();
})();`;
