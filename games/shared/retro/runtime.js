import { RiverRaid } from './river.js';
import { Enduro } from './enduro.js';
import { Pitfall } from './pitfall.js';
import { renderGame } from './render.js';

const definitions = {
  'river-raid':{title:'River Raid',number:'01',subtitle:'A river. One jet. No turning back.',action:'FIRE',Model:RiverRaid,accent:'#e2d879',instructions:'Steer past the banks and islands. Shoot enemies and the center of each bridge. Fly over a fuel depot to refuel; slow down to take on more fuel.',hint:'← → steer · ↑ ↓ speed · Space fire',rules:['3 jets · extra jet every 10,000 points','Destroyed bridges become restart points','Hold fire to repeat; release it before refueling']},
  enduro:{title:'Enduro',number:'02',subtitle:'Corra até o próximo amanhecer.',action:'ACELERAR',Model:Enduro,accent:'#e8c89a',instructions:'Ultrapasse 200 carros no primeiro dia e 300 nos seguintes. Segure ACELERAR; solte para manter a velocidade. Use FREIO antes de um bloqueio.',hint:'← → direção · ↓ freio · Espaço acelerar',rules:['Gelo reduz a resposta; neblina encurta a visão','A bandeira verde confirma a meta do dia','Continue até amanhecer para avançar']},
  pitfall:{title:'Pitfall!',number:'03',subtitle:'Twenty minutes. Thirty-two treasures.',action:'JUMP',Model:Pitfall,accent:'#cad080',instructions:'Explore the jungle in both directions. Jump to grab a swinging vine, then press jump again to release it. Use ladders to reach underground shortcuts.',hint:'← → move · ↑ ↓ ladder · Space jump / release',rules:['3 lives · 255 connected jungle screens','Underground exits travel three screens at once','Logs cost points; pits and creatures cost lives']}
};
const $=id=>document.getElementById(id),kind=document.body.dataset.game,config=definitions[kind];
const canvas=$('canvas'),context=canvas.getContext('2d'),held=new Map(),keys=new Set();
let model=new config.Model(),state='menu',last=0,accumulator=0,countdown=0,roundSent=false,muted=false,crt=false,best=0;
let audioContext,engine,engineGain,previousPadPause=false,storage;
try{storage=localStorage;best=Number(storage.getItem('cooked:retro:v1:'+kind))||0;if(!Number.isFinite(best)||best<0)best=0;muted=storage.getItem('cooked:retro:muted')==='true';crt=storage.getItem('cooked:retro:crt')==='true';}catch{}
document.documentElement.style.setProperty('--accent',config.accent);
$('name').textContent=config.title;$('edition').textContent=`2600 TRIBUTES / ${config.number}`;$('action').textContent=config.action;$('action').setAttribute('aria-label',config.action==='FIRE'?'Fire':kind==='enduro'?'Accelerate':'Jump or release vine');$('hint').textContent=config.hint;
canvas.setAttribute('aria-label',config.title+' game screen. '+config.hint);
for(const rule of config.rules){const li=document.createElement('li');li.textContent=rule;$('rules').append(li);}
function persist(key,value){try{storage?.setItem(key,String(value));}catch{}}
function clear(){keys.clear();held.clear();for(const b of document.querySelectorAll('[data-input]'))b.classList.remove('held');}
function setState(next){state=next;document.body.dataset.state=next;for(const b of document.querySelectorAll('[data-input]'))b.disabled=next!=='playing';$('pause').disabled=!['playing','countdown'].includes(next);}
function labels(){ $('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));$('crt').setAttribute('aria-pressed',String(crt));document.body.classList.toggle('crt',crt); }
function audio(){
  if(muted)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});
    if(!engine&&kind!=='pitfall'){engine=audioContext.createOscillator();engineGain=audioContext.createGain();engine.type='sawtooth';engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(audioContext.destination);engine.start();}
  }catch{}
}
function beep(type){
  if(muted||audioContext?.state!=='running')return;
  const specs={shoot:[920,180,.075],destroy:[180,48,.15],bridge:[110,560,.3],hit:[130,24,.36],jump:[175,540,.16],grab:[440,660,.08],treasure:[440,1320,.35],extra:[660,1320,.4],qualified:[390,780,.3],day:[550,1100,.3],log:[90,70,.05]};
  const s=specs[type];if(!s)return;const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;
  o.type='square';o.frequency.setValueAtTime(s[0],now);o.frequency.exponentialRampToValueAtTime(s[1],now+s[2]);g.gain.setValueAtTime(.026,now);g.gain.exponentialRampToValueAtTime(.001,now+s[2]);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(now+s[2]+.01);o.onended=()=>{o.disconnect();g.disconnect();};
}
function overlay(title,copy,button){$('title').textContent=title;$('instructions').textContent=copy;$('start').textContent=button;$('overlay').hidden=false;$('best').textContent=`BEST ${kind==='enduro'?(best/1000).toFixed(2)+' KM':Math.floor(best).toLocaleString()} · SAVED ON THIS DEVICE`;$('rules').hidden=state!=='menu';$('restart').hidden=state!=='paused';$('subtitle').textContent=state==='menu'?config.subtitle:config.title;}
function pause(){if(!['playing','countdown'].includes(state))return;setState('paused');clear();$('countdown').hidden=true;overlay('PAUSED',config.instructions,'Resume');$('start').focus({preventScroll:true});}
function start(){audio();clear();if(state!=='paused'){model=new config.Model();roundSent=false;}countdown=state==='paused'?.8:2.1;setState('countdown');$('overlay').hidden=true;$('countdown').hidden=false;last=0;accumulator=0;canvas.focus({preventScroll:true});}
function finish(){
  setState('finished');clear();best=Math.max(best,Math.floor(model.score));persist('cooked:retro:v1:'+kind,best);
  const result=kind==='enduro'?`${(model.score/1000).toFixed(2)} km driven`:`${Math.floor(model.score).toLocaleString()} points`;
  overlay(model.won?'EXPEDITION COMPLETE':'GAME OVER',`${result}. ${model.message}`,'Play again');
  if(!roundSent){roundSent=true;if(parent!==window)parent.postMessage({type:'cooked:round-complete',game:kind},location.origin);}
  $('start').focus({preventScroll:true});
}
$('start').onclick=start;$('pause').onclick=pause;$('restart').onclick=()=>{setState('menu');start();};
$('sound').onclick=()=>{muted=!muted;persist('cooked:retro:muted',muted);audio();labels();};
$('crt').onclick=()=>{crt=!crt;persist('cooked:retro:crt',crt);labels();};
for(const b of document.querySelectorAll('[data-input]')){
  const name=b.dataset.input;
  b.onpointerdown=e=>{if(state!=='playing')return;e.preventDefault();audio();b.setPointerCapture(e.pointerId);held.set(e.pointerId,name);b.classList.add('held');};
  const release=e=>{held.delete(e.pointerId);if(![...held.values()].includes(name))b.classList.remove('held');};
  b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  // Keyboard and assistive activation of a focused control also produces a press.
  b.onclick=e=>{if(e.detail!==0||state!=='playing')return;const id=Symbol(name);held.set(id,name);setTimeout(()=>held.delete(id),150);};
}
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'action'};
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(state==='paused')start();else pause();return;}
  if(e.code==='Enter'&&['menu','finished','paused'].includes(state)){e.preventDefault();start();return;}
  if(keyMap[e.code]&&state==='playing'){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='cooked:pause')pause();});
function input(){
  const out={};for(const value of held.values())out[value]=true;for(const key of keys)out[keyMap[key]]=true;
  try{
    const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);
    if(pad){out.left ||=pad.axes[0]<-.25||pad.buttons[14]?.pressed;out.right ||=pad.axes[0]>.25||pad.buttons[15]?.pressed;out.up ||=pad.axes[1]<-.25||pad.buttons[12]?.pressed;out.down ||=pad.axes[1]>.25||pad.buttons[13]?.pressed;out.action ||=pad.buttons[0]?.pressed||pad.buttons[1]?.pressed;const pressed=pad.buttons[9]?.pressed;if(pressed&&!previousPadPause){if(state==='playing')pause();else if(['menu','paused','finished'].includes(state))start();}previousPadPause=!!pressed;}
  }catch{}
  return out;
}
function resize(){const r=$('screen-area').getBoundingClientRect(),width=Math.min(r.width-16,(r.height-16)*4/3,800);canvas.style.width=Math.max(100,width)+'px';canvas.style.height=Math.max(75,width*3/4)+'px';}
new ResizeObserver(resize).observe($('screen-area'));
function frame(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  const controls=input();
  if(state==='countdown'){countdown-=dt;$('countdown').textContent=countdown>.4?String(Math.ceil(countdown)):'GO';if(countdown<=0){$('countdown').hidden=true;setState('playing');}}
  if(state==='playing'){
    accumulator+=dt;while(accumulator>=1/120){model.step(1/120,controls);for(const event of model.events)beep(event);accumulator-=1/120;if(model.done){finish();break;}}
  }
  if(engineGain&&audioContext){engineGain.gain.setTargetAtTime(!muted&&state==='playing'&&!model.dead ? .009 : 0,audioContext.currentTime,.04);engine.frequency.setTargetAtTime(kind==='enduro'?30+model.speed*.43:80+model.speed*1.1,audioContext.currentTime,.05);}
  renderGame(context,kind,model);
  const value=kind==='river-raid'?`Score ${Math.floor(model.score)} · Jets ${model.lives} · Fuel ${Math.ceil(model.fuel)}% · Bridge ${model.bridges}`:kind==='enduro'?`Dia ${model.day} · Faltam ${Math.max(0,model.quota-model.passed)} · ${Math.floor(model.speed*.8)} km/h · ${{day:'dia',ice:'gelo',sunset:'pôr do sol',night:'noite',fog:'neblina',dawn:'amanhecer'}[model.phase]}`:`Score ${Math.floor(model.score)} · Lives ${model.lives} · Treasure ${model.treasures.size}/32 · Room ${model.roomIndex+1}`;
  if($('readout').textContent!==value)$('readout').textContent=value;
  requestAnimationFrame(frame);
}
if(kind==='enduro'){document.documentElement.lang='pt-BR';$('start').textContent='Jogar';$('action').setAttribute('aria-label','Acelerar');document.querySelector('[data-input=down]').textContent='FREIO';document.querySelector('[data-input=down]').setAttribute('aria-label','Frear');}
labels();setState('menu');overlay(config.title,config.instructions,kind==='enduro'?'Jogar':'Start game');resize();requestAnimationFrame(frame);
