import {Fishing} from './fishing.js';
import {Combat} from './combat.js';
import {Keystone} from './keystone.js';
import {render} from './render.js';
import {timeText,clamp} from './common.js';

const definitions={
  'fishing-derby':{title:'FISHING DERBY',Model:Fishing,intro:'Fisgue os peixes. Fuja do tubarão. Chegue a 99 libras.',action:'RECOLHER',
    labels:['VOCÊ · lb','RIVAL · lb','META'],variants:[['classic','Clássico'],['calm','Tranquilo'],['expert','Precisão']],
    hint:'Setas ou arraste a isca. Segure Recolher após fisgar.',
    rules:['Mova a ponta da linha até a boca do peixe. Você é o pescador da esquerda.','São seis fileiras: 2, 4 ou 6 libras por peixe. Os maiores ficam no fundo.','Segure Recolher para subir rápido. Se os dois fisgarem, quem fisgou primeiro tem prioridade.','Desvie do tubarão movendo a linha para os lados. Sem recolher, o peixe sobe devagar.','Vence quem chegar primeiro a 99 libras. O modo Precisão exige maior proximidade da boca.']},
  combat:{title:'COMBAT',Model:Combat,intro:'Você pilota o avião azul. Acerte o rival vermelho.',action:'ATIRAR',
    labels:['VOCÊ','RIVAL','TEMPO'],variants:[['classic','Biplanos'],['rapid','Biplanos · rajadas'],['jets','Jatos']],
    hint:'↶ ↷ girar · + − velocidade · Espaço atirar',
    rules:['Cada acerto vale 1 ponto. O duelo dura 2 minutos e 16 segundos.','O avião sempre avança. Gire para mirar; use + e − para mudar a velocidade.','Aviões e tiros atravessam as bordas. A munição tem alcance limitado.','As nuvens escondem os biplanos, mas não protegem dos tiros.','No modo Rajadas, até três tiros ficam no ar. Nos demais, um por avião.','O rival é controlado pelo jogo. Os controles de rotação foram adaptados para celular.']},
  'keystone-kapers':{title:'KEYSTONE KAPERS',Model:Keystone,intro:'Alcance o ladrão antes que ele escape pelo telhado.',action:'PULAR',
    labels:['PONTOS','FASE','VIDAS'],variants:[],hint:'← → correr · ↑ entrar · ↓ abaixar/sair · Espaço pular',
    rules:['Você começa com 4 policiais: um em ação e três reservas. Cada perseguição tem 50 segundos.','Pule carrinhos, rádios e bolas baixas. Essas colisões custam 9 segundos.','Abaixe para evitar aviões: um acerto custa uma vida. Bolas mais altas também permitem passar abaixado.','Entre no elevador com ↑ quando a porta abrir. Saia com ↓. Ele visita os três andares internos.','Toque nas escadas rolantes para subir. Só elas chegam ao telhado; de lá não há descida.','O mapa mostra você em azul, o ladrão em branco e o elevador em cinza.','Malas e sacos valem 50 pontos. A prisão vale o tempo restante × 100, 200 ou 300, conforme a fase.','Ganhe uma vida a cada 10.000 pontos, até 4 vidas. Obstáculos e ritmo mudam nas próximas perseguições.']}
};
const $=id=>document.getElementById(id),kind=document.body.dataset.game,cfg=definitions[kind];
const canvas=$('canvas'),ctx=canvas.getContext('2d'),keys=new Set(),held=new Map();
let model=new cfg.Model(),state='menu',variant='classic',muted=false,crt=false,storage,record=0;
let last=0,acc=0,countdown=0,sent=false,target=null,drag=null,audioCtx,padPause=false,statusAt=0;
try{storage=localStorage;muted=storage.getItem('cooked:nostalgia:muted')==='true';crt=storage.getItem('cooked:nostalgia:crt')==='true';}catch{}
const persist=(key,value)=>{try{storage?.setItem(key,String(value));}catch{}};
const recordKey=()=>`cooked:nostalgia:v1:${kind}:${variant}`;
function readRecord(){try{record=Number(storage?.getItem(recordKey()))||0;}catch{record=0;}if(!Number.isFinite(record)||record<0)record=0;}
function recordText(){return kind==='fishing-derby'?(record?`Melhor vitória: ${timeText(record)}`:'Primeira vitória ainda não registrada'):`Recorde: ${record.toLocaleString('pt-BR')}`;}
$('name').textContent=cfg.title;$('action').textContent=cfg.action;$('hint').textContent=cfg.hint;
canvas.setAttribute('aria-label',`${cfg.title}. ${cfg.hint}`);
cfg.labels.forEach((label,i)=>$('label-'+i).textContent=label);
for(const rule of cfg.rules){const li=document.createElement('li');li.textContent=rule;$('rules').append(li);}
for(const [value,label]of cfg.variants){const option=document.createElement('option');option.value=value;option.textContent=label;$('variant').append(option);}
if(kind==='combat'){
  $('left').textContent='↶';$('right').textContent='↷';$('left').setAttribute('aria-label','Girar à esquerda');$('right').setAttribute('aria-label','Girar à direita');
  $('up').textContent='+ VELOZ';$('down').textContent='− LENTO';$('up').setAttribute('aria-label','Aumentar velocidade');$('down').setAttribute('aria-label','Reduzir velocidade');
}else if(kind==='keystone-kapers'){
  $('up').textContent='↑ ENTRAR';$('down').textContent='↓ ABAIXAR';$('up').setAttribute('aria-label','Entrar no elevador');$('down').setAttribute('aria-label','Abaixar ou sair do elevador');
}
function clear(){keys.clear();held.clear();target=null;drag=null;for(const b of document.querySelectorAll('.held'))b.classList.remove('held');}
function setState(next){state=next;document.body.dataset.state=next;for(const b of document.querySelectorAll('[data-input]'))b.disabled=next!=='playing';$('pause').disabled=!['playing','countdown'].includes(next);}
function settings(){$('sound').textContent=muted?'Som: desligado':'Som: ligado';$('sound').setAttribute('aria-pressed',String(!muted));$('crt').setAttribute('aria-pressed',String(crt));$('screen').classList.toggle('crt',crt);}
function audio(){if(muted)return;try{audioCtx||=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{});}catch{}}
function sound(event){
  if(muted||audioCtx?.state!=='running')return;
  const tone={hook:[600,850,.09],catch:[500,1200,.22],'cpu-catch':[290,420,.13],bite:[100,32,.27],shoot:[700,200,.065],hit:[130,30,.28],lost:[150,22,.5],arrest:[400,1000,.4],jump:[220,520,.1],pickup:[650,900,.1],bonus:[600,1400,.3],stairs:[120,210,.09],lift:[160,230,.1]}[event];
  if(!tone)return;const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='square';o.frequency.setValueAtTime(tone[0],t);o.frequency.exponentialRampToValueAtTime(tone[1],t+tone[2]);g.gain.setValueAtTime(.024,t);g.gain.exponentialRampToValueAtTime(.001,t+tone[2]);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(t+tone[2]);o.onended=()=>{o.disconnect();g.disconnect();};
}
function menu(title,copy,button){
  $('title').textContent=title;$('intro').textContent=copy;$('start').textContent=button;$('overlay').hidden=false;
  $('restart').hidden=state!=='paused';$('mode-row').hidden=!cfg.variants.length||state==='paused';
  $('variant').disabled=state==='paused';$('best').textContent=`${recordText()} · neste aparelho`;
}
function start(){
  audio();clear();if(state!=='paused'){variant=$('variant').value||'classic';readRecord();model=new cfg.Model({variant});sent=false;}
  countdown=.85;setState('countdown');$('overlay').hidden=true;$('help').hidden=true;$('help-toggle').setAttribute('aria-expanded','false');$('countdown').hidden=false;last=0;acc=0;canvas.focus({preventScroll:true});
}
function pause(){if(!['playing','countdown'].includes(state))return;setState('paused');clear();$('countdown').hidden=true;menu('Jogo pausado','Continue quando quiser.','Continuar');$('start').focus({preventScroll:true});}
function finish(){
  setState('finished');clear();
  if(kind==='fishing-derby'){if(model.won)record=record?Math.min(record,model.time):model.time;}
  else record=Math.max(record,model.score);persist(recordKey(),record);
  menu(model.draw?'EMPATE':model.won?'VOCÊ VENCEU!':'FIM DE JOGO',model.message,'Jogar novamente');$('start').focus({preventScroll:true});
  if(!sent){sent=true;if(parent!==window)parent.postMessage({type:'cooked:round-complete',game:kind},location.origin);}
}
$('start').onclick=start;$('pause').onclick=pause;$('restart').onclick=()=>{setState('menu');start();};
$('help-toggle').onclick=()=>{$('help').hidden=!$('help').hidden;$('help-toggle').setAttribute('aria-expanded',String(!$('help').hidden));};
$('sound').onclick=()=>{muted=!muted;persist('cooked:nostalgia:muted',muted);audio();settings();};
$('crt').onclick=()=>{crt=!crt;persist('cooked:nostalgia:crt',crt);settings();};
$('variant').onchange=()=>{variant=$('variant').value;readRecord();model=new cfg.Model({variant});if(state==='finished'){setState('menu');menu('Pronto para jogar?',cfg.intro,'Jogar');}else $('best').textContent=`${recordText()} · neste aparelho`;};
for(const b of document.querySelectorAll('[data-input]')){
  b.onpointerdown=e=>{if(state!=='playing')return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.input);b.classList.add('held');if(b.dataset.input!=='action')target=null;audio();};
  const release=e=>{held.delete(e.pointerId);if(![...held.values()].includes(b.dataset.input))b.classList.remove('held');};
  b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
  b.onclick=e=>{if(e.detail===0&&state==='playing'){const id=Symbol(b.dataset.input);held.set(id,b.dataset.input);if(b.dataset.input!=='action')target=null;setTimeout(()=>held.delete(id),150);}};
}
function pointer(e){const r=canvas.getBoundingClientRect();target={targetX:clamp((e.clientX-r.left)/r.width*384,18,180),targetY:clamp((e.clientY-r.top)/r.height*288,78,248)};}
canvas.onpointerdown=e=>{if(kind!=='fishing-derby'||state!=='playing')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag=e.pointerId;pointer(e);};
canvas.onpointermove=e=>{if(e.pointerId===drag)pointer(e);};
for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===drag)drag=null;});
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'action'};
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'||e.code==='KeyP'){if(e.repeat)return;e.preventDefault();if(state==='paused')start();else pause();return;}
  if(e.code==='Enter'&&['BUTTON','SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Enter'&&['menu','paused','finished'].includes(state)){e.preventDefault();start();return;}
  if(state==='playing'&&keyMap[e.code]){e.preventDefault();keys.add(e.code);if(keyMap[e.code]!=='action')target=null;}
});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='cooked:pause')pause();});
function controls(){
  const out=target?{...target}:{};for(const value of held.values())out[value]=true;for(const key of keys)out[keyMap[key]]=true;
  try{const p=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);if(p){
    const left=p.axes[0]<-.25||p.buttons[14]?.pressed,right=p.axes[0]>.25||p.buttons[15]?.pressed,up=p.axes[1]<-.25||p.buttons[12]?.pressed,down=p.axes[1]>.25||p.buttons[13]?.pressed;
    if(left||right||up||down){target=null;delete out.targetX;delete out.targetY;}out.left||=left;out.right||=right;out.up||=up;out.down||=down;out.action||=p.buttons[0]?.pressed||p.buttons[7]?.pressed;
    if(p.buttons[9]?.pressed&&!padPause){if(state==='paused')start();else pause();}padPause=Boolean(p.buttons[9]?.pressed);
  }}catch{}return out;
}
function resize(){const area=$('play-area'),width=Math.min(area.clientWidth-24,(area.clientHeight-8)*4/3,760);$('screen').style.width=`${Math.max(1,width)}px`;}
new ResizeObserver(resize).observe($('play-area'));
function frame(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;const input=controls();
  if(state==='countdown'){countdown-=dt;$('countdown').textContent=countdown>.25?'1':'VAI!';if(countdown<=0){$('countdown').hidden=true;setState('playing');}}
  if(state==='playing'){acc+=dt;while(acc>=1/120){model.tick(1/120,input);for(const event of model.events)sound(event);acc-=1/120;if(model.done){finish();break;}}}
  render(ctx,kind,model);
  const values=kind==='fishing-derby'?[...model.scores,99]:kind==='combat'?[...model.scores,timeText(model.remaining)]:[model.score,model.level,model.lives];
  values.forEach((value,i)=>$('stat-'+i).textContent=typeof value==='number'?String(value).padStart(2,'0'):value);
  if(kind==='keystone-kapers'){
    $('hint').textContent=`${timeText(model.remaining)} · ${model.player.inLift?'Elevador: espere a porta abrir e use ↓ para sair.':model.player.floor===3?'Telhado: alcance o ladrão!':'Pule obstáculos. ↑ entra no elevador; ↓ abaixa ou sai.'}`;
  }
  if(now-statusAt>1000){$('status').textContent=cfg.labels.map((s,i)=>`${s}: ${values[i]}`).join('. ');statusAt=now;}
  requestAnimationFrame(frame);
}
readRecord();settings();setState('menu');menu('Pronto para jogar?',cfg.intro,'Jogar');resize();requestAnimationFrame(frame);
