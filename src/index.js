export class ChatRoom {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    const data = JSON.parse(message);
    const payload = JSON.stringify({
      type: "chat",
      user: data.user,
      text: data.text,
    });

    for (const socket of this.state.getWebSockets()) {
      socket.send(payload);
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close();
    this.broadcastPresence();
  }

  async webSocketError(ws, error) {
    ws.close();
    this.broadcastPresence();
  }

  broadcastPresence() {
    const activeCount = this.state.getWebSockets().length;
    const payload = JSON.stringify({
      type: "presence",
      count: activeCount,
    });

    for (const socket of this.state.getWebSockets()) {
      try {
        socket.send(payload);
      } catch (err) {
        // Socket handle cleanup
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const id = env.CHAT_ROOM.idFromName("global");
      const room = env.CHAT_ROOM.get(id);
      return room.fetch(request);
    }

    return new Response(getUI(), {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  },
};

function getUI() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Gaming - Global Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #08090d;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
      position: relative;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.45;
      animation: float 14s infinite alternate ease-in-out;
      z-index: 0;
    }
    .orb-1 { width: 380px; height: 380px; background: #00f2fe; top: -60px; left: -60px; }
    .orb-2 { width: 420px; height: 420px; background: #7928ca; bottom: -80px; right: -80px; animation-delay: -5s; }
    .orb-3 { width: 280px; height: 280px; background: #ff0070; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.2; animation-delay: -9s; }

    @keyframes float {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(40px, 50px) scale(1.15); }
    }

    .glass-card {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 760px;
      height: 640px;
      background: rgba(15, 18, 28, 0.45);
      backdrop-filter: blur(28px) saturate(190%);
      -webkit-backdrop-filter: blur(28px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7),
                  inset 0 1px 1px rgba(255, 255, 255, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header {
      padding: 18px 24px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #00f2fe, #4facfe, #7928ca);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #fff;
      font-size: 20px;
      box-shadow: 0 0 18px rgba(0, 242, 254, 0.45);
    }
    .brand-title {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      background: linear-gradient(90deg, #ffffff, #00f2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.8);
      background: rgba(0, 242, 254, 0.08);
      border: 1px solid rgba(0, 242, 254, 0.22);
      padding: 6px 14px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: #00f2fe;
      border-radius: 50%;
      box-shadow: 0 0 10px #00f2fe;
    }

    #chat {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    #chat::-webkit-scrollbar {
      width: 6px;
    }
    #chat::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }

    .msg {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      line-height: 1.45;
      font-size: 0.92rem;
      animation: slideIn 0.2s ease-out forwards;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .sender {
      font-weight: 700;
      font-size: 0.78rem;
      color: #00f2fe;
      margin-bottom: 4px;
      display: block;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .input-panel {
      padding: 18px 24px;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 12px;
    }
    .glass-input {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 12px 18px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.25s ease;
      backdrop-filter: blur(10px);
    }
    .glass-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    .glass-input:focus {
      border-color: rgba(0, 242, 254, 0.6);
      box-shadow: 0 0 18px rgba(0, 242, 254, 0.25);
      background: rgba(0, 0, 0, 0.5);
    }
    #username { width: 28%; }
    #message { flex: 1; }

    .glass-btn {
      background: linear-gradient(135deg, #00f2fe, #4facfe);
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #050811;
      font-weight: 800;
      padding: 12px 24px;
      border-radius: 14px;
      cursor: pointer;
      font-size: 0.9rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: all 0.25s ease;
      box-shadow: 0 4px 20px rgba(0, 242, 254, 0.35);
    }
    .glass-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 242, 254, 0.55);
    }
    .glass-btn:active {
      transform: translateY(1px);
    }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>

  <div class="glass-card">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">N</div>
        <div class="brand-title">Nova Gaming</div>
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        <span id="user-count">1 Player Online</span>
      </div>
    </div>

    <div id="chat"></div>

    <div class="input-panel">
      <input id="username" class="glass-input" placeholder="Handle" maxlength="20" />
      <input id="message" class="glass-input" placeholder="Send a message..." onkeypress="if(event.key==='Enter') send()" />
      <button class="glass-btn" onclick="send()">Send</button>
    </div>
  </div>

  <script>
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    const chat = document.getElementById('chat');
    const userCount = document.getElementById('user-count');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'presence') {
        userCount.textContent = `${data.count} ${data.count === 1 ? 'Player' : 'Players'} Online`;
        return;
      }

      if (data.type === 'chat') {
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<span class="sender">${escapeHtml(data.user)}</span>${escapeHtml(data.text)}`;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
      }
    };

    function send() {
      const user = document.getElementById('username').value.trim() || 'Player';
      const textInput = document.getElementById('message');
      const text = textInput.value.trim();
      if (!text) return;
      ws.send(JSON.stringify({ user, text }));
      textInput.value = '';
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  </script>
</body>
</html>`;
}
