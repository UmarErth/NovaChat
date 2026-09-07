import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { getUI } from '../src/ui.js';

function fixture({embedded=false,enabled=false,hidden=false}={}) {
  const elements=new Map(), events=new Map(), alerts=[];
  class Element {
    constructor(){this.children=[];this.handlers={};this.hidden=true;this.value='';this.style={};this.scrollHeight=100;this.clientHeight=100;this.scrollTop=0;this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    appendChild(child){this.append(child);}
    prepend(...children){this.children.unshift(...children);}
    replaceChildren(...children){this.children=[];this.append(...children);}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.removed=true;}
    setAttribute(k,v){this[k]=v;}
    removeAttribute(k){delete this[k];}
    addEventListener(k,fn){this.handlers[k]=fn;}
    querySelector(key){return get(key);}
    querySelectorAll(){return [];}
    focus(){}
    contains(){return true;}
    getBoundingClientRect(){return {height:20};}
    get firstElementChild(){return this.children[0];}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const state={hidden,focused:true,permissionRequests:0};
  class Notification {
    static permission='granted';
    static async requestPermission(){state.permissionRequests++;return Notification.permission;}
    constructor(title,options){this.title=title;this.options=options;alerts.push(this);}
    close(){this.closed=true;}
  }
  class WebSocket {static OPEN=1;constructor(){this.readyState=1;}send(){}close(){}}
  const storage=new Map([['nova.chat.name.v1','Tester'],['nova.chat.notifications.v1',enabled?'on':'off']]);
  const document={title:'Nova Chat',get hidden(){return state.hidden;},hasFocus:()=>state.focused,getElementById:get,querySelector:get,createElement:()=>new Element(),addEventListener:(type,fn)=>events.set('document:'+type,fn)};
  const c={document,Notification,WebSocket,URLSearchParams,location:{search:embedded?'?novaEmbed=1':'',protocol:'https:',host:'nova.test'},isSecureContext:true,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},console,addEventListener:(type,fn)=>events.set(type,fn),focus(){state.focused=true;}};
  c.window=c;c.parent=embedded?{}:c;
  let code=getUI().match(/<script>([\s\S]*?)<\/script>/)[1];
  code=code.replace('  connect();',"  connect(); globalThis.api={receiveMessage,selectConversation,readActiveConversation,chatIsVisible,conversations,notifyDm,clearDmAlert,getWs:()=>ws,setSelf:id=>selfId=id};");
  vm.createContext(c);vm.runInContext(code,c);c.api.setSelf('a'.repeat(64));
  const dm={type:'dm',from:'b'.repeat(64),to:'a'.repeat(64),user:'Friend',text:'Hello <img src=x>',own:false};
  return {c,get,events,state,alerts,storage,dm};
}
test('DM produces a clickable safe-text toast, unread count and title',()=>{
  const f=fixture();f.c.api.receiveMessage(f.dm);
  assert.equal(f.get('dm-toasts').children.length,1);
  const toast=f.get('dm-toasts').children[0];
  assert.equal(toast.children[0].children[1].textContent,f.dm.text);
  assert.equal(f.get('total-unread').textContent,'1');assert.equal(f.c.document.title,'(1) Nova Chat');
  toast.children[0].handlers.click();
  assert.equal(f.get('total-unread').hidden,true);assert.equal(f.get('dm-toasts').children.length,0);
});
test('public messages, own DMs and unrelated DMs never alert',()=>{
  const f=fixture();for(const data of [{...f.dm,type:'chat'},{...f.dm,own:true,from:f.dm.to,to:f.dm.from},{...f.dm,to:'c'.repeat(64)}])f.c.api.receiveMessage(data);
  assert.equal(f.get('dm-toasts').children.length,0);assert.equal(f.alerts.length,0);
});
test('active conversation suppresses alerts only while foreground',()=>{
  const f=fixture();f.c.api.selectConversation(f.dm.from,'Friend');f.c.api.receiveMessage(f.dm);assert.equal(f.get('dm-toasts').children.length,0);
  f.state.hidden=true;f.c.api.receiveMessage(f.dm);assert.equal(f.get('dm-toasts').children.length,1);assert.equal(f.get('total-unread').textContent,'1');
  f.state.hidden=false;f.events.get('document:visibilitychange')();assert.equal(f.get('total-unread').hidden,true);
});
test('system notifications are opt-in and never request permission on load',async()=>{
  const f=fixture();f.c.api.receiveMessage(f.dm);assert.equal(f.alerts.length,0);assert.equal(f.state.permissionRequests,0);
  await f.get('notify-toggle').handlers.click();assert.equal(f.state.permissionRequests,1);
  f.c.api.receiveMessage(f.dm);assert.equal(f.alerts.length,1);
  await f.get('notify-toggle').handlers.click();assert(f.alerts[0].closed);
});
test('blocked permissions preserve in-app notifications',async()=>{
  const f=fixture();f.c.Notification.permission='denied';await f.get('notify-toggle').handlers.click();f.c.api.receiveMessage(f.dm);
  assert.equal(f.alerts.length,0);assert.equal(f.get('dm-toasts').children.length,1);
});
test('dismissal preserves unread badge and visible toasts stay bounded',()=>{
  const f=fixture();for(let i=0;i<6;i++)f.c.api.receiveMessage({...f.dm,from:String(i).repeat(64)});
  assert.equal(f.get('dm-toasts').children.length,3);f.get('dm-toasts').children[0].children[1].handlers.click();assert.equal(f.get('total-unread').textContent,'6');
});
test('bridge rejects messages from unrelated windows and sends no previews until attached',()=>{
  const f=fixture({embedded:true});const sent=[];const port={postMessage:x=>sent.push(x),start(){},close(){}};
  f.events.get('message')({source:{},data:{type:'nova-chat-connect'},ports:[port]});f.c.api.receiveMessage(f.dm);assert.equal(sent.length,0);
  f.events.get('message')({source:f.c.parent,data:{type:'nova-chat-connect'},ports:[port]});
  f.c.api.receiveMessage(f.dm);assert(sent.some(x=>x.type==='dm'&&x.peer===f.dm.from));
});
test('embedded hidden conversation keeps unread and host click opens the correct DM',()=>{
  const f=fixture({embedded:true,enabled:true});const sent=[];const port={postMessage:x=>sent.push(x),start(){},close(){}};
  f.events.get('message')({source:f.c.parent,data:{type:'nova-chat-connect'},ports:[port]});f.c.api.selectConversation(f.dm.from,'Friend');
  port.onmessage({data:{type:'visibility',visible:false}});f.c.api.receiveMessage(f.dm);assert.equal(f.get('total-unread').textContent,'1');assert.equal(f.alerts.length,0);
  port.onmessage({data:{type:'visibility',visible:true}});port.onmessage({data:{type:'open-dm',peer:f.dm.from}});
  assert.equal(f.get('conversation-title').textContent,'Friend');assert.equal(f.get('total-unread').hidden,true);
});
test('unsupported browser notifications do not break DMs',async()=>{
  const f=fixture();delete f.c.Notification;await f.get('notify-toggle').handlers.click();f.c.api.receiveMessage(f.dm);assert.equal(f.get('dm-toasts').children.length,1);
});
