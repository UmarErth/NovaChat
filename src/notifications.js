// Kept as browser source so Worker builds cannot inject server-only helpers.
export const notificationScript = String.raw`
  const NOTIFY_KEY = 'nova.chat.notifications.v1';
  let nativeEnabled = read(NOTIFY_KEY) === 'on';
  let hostPort = null, hostVisible = false;
  const nativeAlerts = new Map(), toastAlerts = new Map();
  const baseTitle = document.title;
  const bridgeRequested = new URLSearchParams(location.search).get('novaEmbed') === '1';
  function chatIsVisible() {
    return !document.hidden && overlay.hidden && (hostPort ? hostVisible : document.hasFocus());
  }
  function totalUnread() {
    let count = 0;
    for (const [id, entry] of conversations) if (id !== 'global') count += entry.unread;
    return count;
  }
  function postHost(data) { try { hostPort?.postMessage(data); } catch {} }
  function syncNotifications() {
    const count = totalUnread();
    document.title = count ? '(' + count + ') Nova Chat' : baseTitle;
    postHost({type:'unread', count});
  }
  function clearDmAlert(id) {
    const toast = toastAlerts.get(id);
    if (toast) { clearTimeout(toast.timer); toast.element.remove(); toastAlerts.delete(id); }
    try { nativeAlerts.get(id)?.close(); } catch {}
    nativeAlerts.delete(id);
  }
  function readActiveConversation() {
    if (!chatIsVisible()) return;
    const entry = conversations.get(selected);
    if (entry?.unread) { entry.unread = 0; renderContacts(); }
    clearDmAlert(selected);
    syncNotifications();
  }
  function openDm(id, user) {
    if (!overlay.hidden) return;
    window.focus(); selectConversation(id, user); clearDmAlert(id);
  }
  function notifyDm(data) {
    if (data.own || data.type !== 'dm') return;
    const id = data.from;
    $('dm-alert').textContent = data.user + ' sent you a direct message.';
    // Only the explicitly attached parent receives private DM previews.
    postHost({type:'dm', peer:id, user:data.user, text:data.text.slice(0,160), count:totalUnread()});
    clearDmAlert(id);
    const element = document.createElement('div'); element.className = 'dm-toast';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'dm-toast-open';
    const title = document.createElement('strong'); title.textContent = data.user + ' sent you a DM';
    const preview = document.createElement('span'); preview.textContent = data.text.slice(0,160);
    open.append(title, preview); open.addEventListener('click', () => openDm(id, data.user));
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '×';
    dismiss.setAttribute('aria-label','Dismiss notification'); dismiss.addEventListener('click', () => clearDmAlert(id));
    element.append(open,dismiss); $('dm-toasts').appendChild(element);
    toastAlerts.set(id,{element,timer:setTimeout(() => clearDmToast(id),12000)});
    while(toastAlerts.size>3) clearDmToast(toastAlerts.keys().next().value);
    // The desktop owns system notifications for its embedded chat, avoiding duplicates.
    if (!hostPort && nativeEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const alert = new Notification('Nova Chat · ' + data.user, {body:data.text.slice(0,160),tag:'nova-dm-'+id});
        nativeAlerts.set(id,alert);
        alert.onclick = () => openDm(id,data.user);
        alert.onclose = () => { if(nativeAlerts.get(id)===alert)nativeAlerts.delete(id); };
      } catch { /* In-app alerts work when system notifications are unavailable. */ }
    }
  }
  function clearDmToast(id) {
    const toast=toastAlerts.get(id); if(!toast)return;
    clearTimeout(toast.timer);toast.element.remove();toastAlerts.delete(id);
  }
  function updateNotifyButton() {
    const button=$('notify-toggle');
    button.textContent=nativeEnabled?'Notifications on':'Enable notifications';
    button.setAttribute('aria-pressed',String(nativeEnabled));
  }
  $('notify-toggle').addEventListener('click',async () => {
    if(hostPort){notice.textContent='Use Enable alerts in the Nova desktop to turn on browser notifications.';return;}
    if(nativeEnabled){nativeEnabled=false;save(NOTIFY_KEY,'off');for(const id of nativeAlerts.keys())clearDmAlert(id);updateNotifyButton();return;}
    if(window.parent!==window || !window.isSecureContext || !('Notification' in window)){
      notice.textContent='In-app DM alerts are on. Open Nova Chat directly over HTTPS for browser notifications.';return;
    }
    try{
      const permission=await Notification.requestPermission();
      nativeEnabled=permission==='granted';save(NOTIFY_KEY,nativeEnabled?'on':'off');updateNotifyButton();
      notice.textContent=nativeEnabled?'Browser notifications enabled while Nova Chat is connected.':'Browser notifications are blocked. In-app DM alerts still work.';
    }catch{notice.textContent='Browser notifications are unavailable. In-app DM alerts still work.';}
  });
  window.addEventListener('message',event => {
    if(!bridgeRequested || event.source!==window.parent || window.parent===window || event.data?.type!=='nova-chat-connect' || !event.ports?.[0])return;
    hostPort?.close();hostPort=event.ports[0];hostVisible=false;
    hostPort.onmessage=event => {
      const data=event.data;
      if(data?.type==='visibility'){hostVisible=data.visible===true;readActiveConversation();}
      if(data?.type==='open-dm' && typeof data.peer==='string' && conversations.has(data.peer))openDm(data.peer,conversations.get(data.peer).user);
    };
    hostPort.start();postHost({type:'ready'});syncNotifications();
  });
  document.addEventListener('visibilitychange',readActiveConversation);
  document.addEventListener('pointerdown',() => postHost({type:'focus'}));
  document.addEventListener('focusin',() => postHost({type:'focus'}));
  window.addEventListener('focus',readActiveConversation);
  window.addEventListener('pagehide',() => {for(const id of nativeAlerts.keys())clearDmAlert(id);hostPort?.close();});
  updateNotifyButton();
`;
