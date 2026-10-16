// Чмок-пузыри. Правила безопасности проекта — в SECURITY.md; этот код обязан им соответствовать.

// Статья 7: страница не работает внутри чужой рамки (защита от обманных нажатий)
if(window.top!==window.self){
  document.body.textContent="Открой эту страницу напрямую: https://mishutkamd.github.io/kisses/";
  throw new Error("framed");
}

const VER="10";
// Своя копия MediaPipe (vendor/). Модель лица — с сервера Google, но только если совпадает её отпечаток SHA-256.
const VISION=new URL("vendor/mediapipe/",location.href).href;
const MODEL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MODEL_SHA256="64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
// Telegram и браузеры любят показывать старую версию из кэша. Проверяем, нет ли свежей (только на своём сайте), и если есть — перезагружаемся.
(async()=>{
  try{
    const r=await fetch(location.pathname+"?check="+Date.now(),{cache:"no-store"});
    const fresh=(/<meta name="app-version" content="(\d{1,4})">/.exec(await r.text())||[])[1];
    if(fresh&&+fresh>+VER){
      const key="chmok-upd-"+fresh;
      if(sessionStorage.getItem(key))return;
      sessionStorage.setItem(key,"1");
      location.replace(location.pathname+"?u="+fresh+location.hash);
    }
  }catch{}
})();
const ROOM_PREFIX="chmokkiss-";
// Распознавание идёт ~15 раз в секунду на маленькой копии кадра: этого хватает для поцелуя и сильно разгружает телефон
const DET_LONG=256, DET_INTERVAL=66, COOLDOWN=200;
// Насколько сильнее обычного должны сложиться губы, чтобы сработало
const SENS=[{name:"Чутко",d:0.09},{name:"Средне",d:0.15},{name:"Строго",d:0.23}];

const $=id=>document.getElementById(id);
const selfV=$("self"), remoteV=$("remote"), cv=$("fx"), ctx=cv.getContext("2d");
const bar=$("bar"), countEl=$("count");
// Комната берётся только из части ссылки после # (она не уходит ни на один сервер): #r-<номер>.<секрет>
const linkMatch=/^#r-([a-km-np-z2-9]{10})\.([a-km-np-z2-9]{26})$/.exec(location.hash);
const linkRoom=linkMatch?{id:linkMatch[1],secret:linkMatch[2]}:null;
const oldLink=!linkRoom&&/^#r-/.test(location.hash);

let W=0,H=0,DPR=1;
function resize(){
  W=innerWidth;H=innerHeight;
  DPR=Math.min(window.devicePixelRatio||1,1.5);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize",resize);resize();

function flash(msg,ms=4000){const h=$("hint");h.textContent=msg;h.hidden=false;h.style.opacity=1;clearTimeout(flash.t);flash.t=setTimeout(()=>h.style.opacity=0,ms)}

let sens=0;
try{const v=localStorage.getItem("chmok-sens");if(v!==null&&+v>=0&&+v<SENS.length)sens=+v}catch{}
function showSens(){const b=$("sensBtn");b.textContent="♡ "+SENS[sens].name;b.setAttribute("aria-label","Чувствительность к поцелуям: "+SENS[sens].name)}
showSens();
$("sensBtn").addEventListener("click",()=>{sens=(sens+1)%SENS.length;showSens();try{localStorage.setItem("chmok-sens",sens)}catch{}});

/* ================= ЗВУК ================= */
let ac=null, master=null, recDest=null, customBuf=null;
function initAudio(){
  if(ac)return;
  ac=new (window.AudioContext||window.webkitAudioContext)();
  master=ac.createGain();master.gain.value=0.9;
  master.connect(ac.destination);
  recDest=ac.createMediaStreamDestination();
  master.connect(recDest);
}
// голоса в звонке идут только в запись (в динамик их и так выводит видео)
const recSources=new Map();
function feedRecording(key,stream){
  if(!ac||!stream||!stream.getAudioTracks().length)return;
  try{recSources.get(key)?.disconnect()}catch{}
  try{const src=ac.createMediaStreamSource(stream);src.connect(recDest);recSources.set(key,src)}catch{}
}
let noiseBuf=null;
function noise(){
  if(noiseBuf)return noiseBuf;
  noiseBuf=ac.createBuffer(1,ac.sampleRate*0.2,ac.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return noiseBuf;
}
function synthKiss(vol=1){
  const t=ac.currentTime+0.005, p=0.9+Math.random()*0.2;
  const n=ac.createBufferSource();n.buffer=noise();
  const bp=ac.createBiquadFilter();bp.type="bandpass";bp.Q.value=1.4;
  bp.frequency.setValueAtTime(2200*p,t);bp.frequency.exponentialRampToValueAtTime(800*p,t+0.06);
  const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.9*vol,t+0.004);g.gain.exponentialRampToValueAtTime(0.001,t+0.07);
  n.connect(bp).connect(g).connect(master);n.start(t);n.stop(t+0.1);
  const o=ac.createOscillator();o.type="sine";
  o.frequency.setValueAtTime(220*p,t);o.frequency.exponentialRampToValueAtTime(90,t+0.06);
  const og=ac.createGain();og.gain.setValueAtTime(0.5*vol,t);og.gain.exponentialRampToValueAtTime(0.001,t+0.07);
  o.connect(og).connect(master);o.start(t);o.stop(t+0.08);
  const t2=t+0.07;
  const b=ac.createOscillator();b.type="sine";
  b.frequency.setValueAtTime(280*p,t2);b.frequency.exponentialRampToValueAtTime(1100*p,t2+0.14);
  const bg=ac.createGain();bg.gain.setValueAtTime(0,t2);bg.gain.linearRampToValueAtTime(0.28*vol,t2+0.02);bg.gain.exponentialRampToValueAtTime(0.001,t2+0.18);
  b.connect(bg).connect(master);b.start(t2);b.stop(t2+0.2);
}
function playKiss(){
  if(!ac)return;
  if(ac.state==="suspended")ac.resume();
  if(customBuf){
    const s=ac.createBufferSource();s.buffer=customBuf;s.playbackRate.value=0.96+Math.random()*0.08;
    s.connect(master);s.start();
  }else synthKiss();
}
function popSound(){
  if(!ac||customBuf)return;
  const t=ac.currentTime+0.005;
  const o=ac.createOscillator();o.type="triangle";
  o.frequency.setValueAtTime(1400,t);o.frequency.exponentialRampToValueAtTime(500,t+0.05);
  const g=ac.createGain();g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
  o.connect(g).connect(master);o.start(t);o.stop(t+0.07);
}

const DB="chmok",STORE="s";
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function saveSound(name,buf){try{const db=await idb();db.transaction(STORE,"readwrite").objectStore(STORE).put({name,buf},"kiss")}catch{}}
async function loadSound(){try{const db=await idb();return await new Promise(res=>{const r=db.transaction(STORE).objectStore(STORE).get("kiss");r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})}catch{return null}}
async function clearSound(){try{const db=await idb();db.transaction(STORE,"readwrite").objectStore(STORE).delete("kiss")}catch{}}
function decode(ab){return new Promise((res,rej)=>{const p=ac.decodeAudioData(ab.slice(0),res,rej);if(p&&p.then)p.then(res,rej)})}
function showSoundState(name){$("soundBtn").textContent=name?("♪ "+name):"Свой звук";$("resetSound").hidden=!name}
$("soundBtn").addEventListener("click",()=>$("soundFile").click());
$("soundFile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  initAudio();
  try{
    const ab=await f.arrayBuffer();
    customBuf=await decode(ab);
    const name=f.name.replace(/\.[^.]+$/,"").slice(0,16);
    showSoundState(name);saveSound(name,ab);playKiss();
  }catch{flash("Этот файл не получилось прочитать как звук. Попробуй m4a, mp3 или wav.")}
  e.target.value="";
});
$("resetSound").addEventListener("click",()=>{customBuf=null;showSoundState(null);clearSound();playKiss()});

/* ================= ОКНА С КАМЕРАМИ ================= */
// Координаты лица приходят в долях кадра камеры. Переводим их в точку на экране с учётом object-fit:cover и зеркала.
function tileGeom(v){
  const r=v.getBoundingClientRect(),vw=v.videoWidth||4,vh=v.videoHeight||3;
  const k=Math.max(r.width/vw,r.height/vh);
  return {r,dw:vw*k,dh:vh*k,mirror:v===selfV};
}
function toScreen(v,lx,ly){
  const g=tileGeom(v);let px=(g.r.width-g.dw)/2+lx*g.dw;if(g.mirror)px=g.r.width-px;
  return {x:g.r.left+px,y:g.r.top+(g.r.height-g.dh)/2+ly*g.dh,size:Math.min(g.r.width,g.r.height)};
}
function fromScreen(v,sx,sy){
  const g=tileGeom(v);let px=sx-g.r.left;if(g.mirror)px=g.r.width-px;
  return {x:(px-(g.r.width-g.dw)/2)/g.dw,y:(sy-g.r.top-(g.r.height-g.dh)/2)/g.dh};
}
function tileAt(sx,sy){
  for(const v of paired?[selfV,remoteV]:[selfV]){
    const r=v.getBoundingClientRect();
    if(sx>=r.left&&sx<=r.right&&sy>=r.top&&sy<=r.bottom)return v;
  }
  return paired?remoteV:selfV;
}

/* ================= СЕРДЦА ================= */
const HEART=[];
for(let i=0;i<=120;i++){
  const t=i/120*Math.PI*2;
  HEART.push([16*Math.sin(t)**3/17,(-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))+2)/17]);
}
const SPR=192;
function makeSprite(base,mid,deep){
  const c=document.createElement("canvas");c.width=c.height=SPR;
  const g=c.getContext("2d"),s=SPR*0.46;
  g.translate(SPR/2,SPR/2);
  const path=()=>{g.beginPath();HEART.forEach(([x,y],i)=>i?g.lineTo(x*s,y*s):g.moveTo(x*s,y*s));g.closePath()};
  g.shadowColor="rgba(80,0,10,.45)";g.shadowBlur=SPR*0.05;g.shadowOffsetY=SPR*0.02;
  path();
  const body=g.createRadialGradient(-s*.25,-s*.3,s*.05,0,0,s*1.05);
  body.addColorStop(0,base);body.addColorStop(.55,mid);body.addColorStop(1,deep);
  g.fillStyle=body;g.fill();
  g.shadowColor="transparent";
  g.save();path();g.clip();
  const rim=g.createRadialGradient(s*.3,s*.35,s*.2,s*.3,s*.35,s*.9);
  rim.addColorStop(0,"rgba(255,90,110,0)");rim.addColorStop(1,"rgba(255,120,140,.35)");
  g.fillStyle=rim;g.fillRect(-s,-s,s*2,s*2);
  g.restore();
  g.fillStyle="rgba(255,255,255,.85)";g.beginPath();g.ellipse(-s*.42,-s*.42,s*.16,s*.07,-0.7,0,Math.PI*2);g.fill();
  g.fillStyle="rgba(255,255,255,.6)";g.beginPath();g.arc(-s*.18,-s*.56,s*.035,0,Math.PI*2);g.fill();
  return c;
}
const SPRITES=[makeSprite("#ff5a6e","#e0102e","#8e0016"),makeSprite("#ff4060","#d10a2a","#7a0014"),makeSprite("#ff6f7d","#ec1c3a","#9a0a22")];

const hearts=[],drops=[];
let total=0;
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const BURST=7;

// v — окно, из которого вылетают сердечки; lx,ly — рот в долях кадра этой камеры
const MAX_HEARTS=280;
function burstAt(v,lx,ly){
  if(hearts.length>MAX_HEARTS)return;
  const p=toScreen(v,lx,ly);
  // в маленьком окошке сердечки всё равно делаем заметными
  const base=Math.max(p.size,Math.min(W,H)*0.55);
  for(let i=0;i<BURST;i++){
    const a=-Math.PI/2+(i/(BURST-1)-.5)*Math.PI*0.7+(Math.random()-.5)*0.25;
    const sp=base*(0.45+Math.random()*0.35);
    hearts.push({
      x:p.x,y:p.y,size:base*(0.06+Math.random()*0.05),age:-i*0.035,
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,rise:base*0.07,
      rot:(Math.random()-.5)*0.6,spin:(Math.random()-.5)*1.2,
      phase:Math.random()*6.28,life:2.2+Math.random()*1.3,
      spr:SPRITES[(Math.random()*SPRITES.length)|0]
    });
  }
  total++;countEl.textContent="♥ "+total;
  playKiss();
}
// мой поцелуй: показать у себя и отправить ей
function myKiss(lx,ly){burstAt(selfV,lx,ly);send({t:"k",o:"s",x:lx,y:ly})}
let lastPop=0;
function pop(h){
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+Math.random()*.4,sp=50+Math.random()*90;
    drops.push({x:h.x,y:h.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:1.5+Math.random()*2.2,life:.5,age:0});
  }
  const n=performance.now();if(n-lastPop>140){lastPop=n;popSound()}
}
const easeOutBack=t=>{const c=1.7;return 1+(c+1)*(t-1)**3+c*(t-1)**2};
function drawHeart(h,t){
  const grow=Math.min(1,h.age/0.22);
  const s=h.size*(0.2+0.8*easeOutBack(grow));
  const beat=1+Math.max(0,Math.sin(t*7+h.phase))**8*0.12;
  const fade=h.age>h.life-0.3?Math.max(0,(h.life-h.age)/0.3):1;
  const d=s*2*beat/0.92;
  ctx.globalAlpha=fade;
  ctx.translate(h.x,h.y);ctx.rotate(h.rot);
  ctx.drawImage(h.spr,-d/2,-d/2,d,d);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}

/* ================= РАСПОЗНАВАНИЕ ================= */
let landmarker=null,lastVT=-1,nextDetect=0,maxFaces=1;
const det=document.createElement("canvas"),dctx=det.getContext("2d");
const clamp01=v=>v<0?0:v>1?1:v;
const slots=[];
function newSlot(){return {x:.5,y:.5,ok:false,armed:true,lastFire:0,base:0,bb:-1,overSince:0,seen:0}}
// первые полсекунды после появления лица только запоминаем, как выглядят губы в покое, и ничего не запускаем
const WARMUP=900, HOLD=90;

function assign(mouths){
  while(slots.length<maxFaces)slots.push(newSlot());
  const used=new Set(),out=new Array(maxFaces).fill(null);
  slots.forEach((s,si)=>{
    if(!s.ok)return;
    let best=-1,bd=Infinity;
    mouths.forEach((m,mi)=>{if(used.has(mi))return;const d=(m.x-s.x)**2+(m.y-s.y)**2;if(d<bd){bd=d;best=mi}});
    if(best>=0){used.add(best);out[si]=mouths[best]}
  });
  mouths.forEach((m,mi)=>{
    if(used.has(mi))return;
    let si=out.findIndex((o,k)=>o===null&&!slots[k].ok);
    if(si<0)si=out.findIndex(o=>o===null);
    if(si>=0){out[si]=m;used.add(mi)}
  });
  return out;
}

function detect(now){
  const vw=selfV.videoWidth,vh=selfV.videoHeight;
  const k=DET_LONG/Math.max(vw,vh);
  const w=Math.round(vw*k),h=Math.round(vh*k);
  if(det.width!==w||det.height!==h){det.width=w;det.height=h}
  dctx.drawImage(selfV,0,0,w,h);
  const t0=performance.now();
  const r=landmarker.detectForVideo(det,now);
  const dur=performance.now()-t0;
  nextDetect=now+Math.min(Math.max(DET_INTERVAL,dur*1.5),110);

  const mouths=(r.faceLandmarks||[]).map((L,fi)=>{
    const bs=r.faceBlendshapes?.[fi]?.categories||[];
    const get=n=>bs.find(c=>c.categoryName===n)?.score||0;
    const d=(i,j)=>Math.hypot((L[i].x-L[j].x)*vw,(L[i].y-L[j].y)*vh);
    return {
      x:(L[13].x+L[14].x)/2,y:(L[13].y+L[14].y)/2,
      blend:Math.max(get("mouthPucker"),get("mouthFunnel")*0.85),
      smile:Math.max(get("mouthSmileLeft"),get("mouthSmileRight")),
      jaw:get("jawOpen"),
      ratio:d(61,291)/d(234,454)
    };
  });
  const got=assign(mouths);
  const D=SENS[sens].d;
  let show=0;
  slots.forEach((s,i)=>{
    const m=got[i];
    if(!m){s.ok=false;s.armed=true;s.base=0;s.bb=-1;s.overSince=0;s.seen=0;return}
    if(!s.ok)s.seen=now;
    s.x=m.x;s.y=m.y;s.ok=true;
    const warm=now-s.seen<WARMUP;
    // обычная ширина рта этого человека
    if(!s.base)s.base=m.ratio;
    else if(warm)s.base+=(m.ratio-s.base)*0.3;
    else if(m.blend<0.15&&m.smile<0.25&&m.jaw<0.25)s.base+=(m.ratio-s.base)*0.05;
    const geom=(m.smile>0.3||m.jaw>0.25)?0:clamp01((s.base-m.ratio)/(s.base*0.3));
    const p=Math.max(m.blend,geom*0.8);
    // «спокойное» значение для этого лица: у кого-то губы и в покое немного вытянуты
    if(s.bb<0)s.bb=p;
    else if(warm)s.bb+=(p-s.bb)*0.3;
    else if(p<s.bb+D*0.6)s.bb+=(p-s.bb)*0.06;
    if(warm){s.armed=false;s.overSince=0;return}
    const rise=p-s.bb;
    show=Math.max(show,rise/(2*D));
    // короткое «у»/«о» в разговоре не считается: губы должны держаться сложенными ~0,1 с, а сильный чмок срабатывает сразу
    if(rise>D){if(!s.overSince)s.overSince=now}else s.overSince=0;
    const fire=rise>Math.max(2*D,0.32)||(s.overSince&&now-s.overSince>=HOLD);
    if(s.armed&&fire&&now-s.lastFire>COOLDOWN){myKiss(s.x,s.y);s.armed=false;s.lastFire=now}
    if(rise<D*0.45)s.armed=true;
  });
  bar.style.width=Math.min(100,show*100)+"%";
}

/* ================= ГЛАВНЫЙ ЦИКЛ ================= */
let prev=performance.now(),running=false;
function loop(now){
  const dt=Math.min(.05,(now-prev)/1000);prev=now;const t=now/1000;
  if(landmarker&&selfV.readyState>=2&&now>=nextDetect&&selfV.currentTime!==lastVT){
    lastVT=selfV.currentTime;
    try{detect(now)}catch{}
  }
  ctx.clearRect(0,0,W,H);
  for(let i=hearts.length-1;i>=0;i--){
    const h=hearts[i];h.age+=dt;
    if(h.age<0)continue;
    const sway=reduce?0:Math.sin(t*2.2+h.phase)*h.size*0.6;
    h.x+=(h.vx+sway)*dt;h.y+=h.vy*dt;
    h.vx*=0.985;h.vy=h.vy*0.985-h.rise*dt;
    h.rot+=h.spin*dt;
    drawHeart(h,t);
    if(h.age>h.life||h.y<-h.size*2||h.x<-h.size*2||h.x>W+h.size*2){if(h.age>h.life)pop(h);hearts.splice(i,1)}
  }
  ctx.globalAlpha=1;
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];d.age+=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=200*dt;
    const a=1-d.age/d.life;if(a<=0){drops.splice(i,1);continue}
    ctx.fillStyle=`rgba(235,20,50,${a})`;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();
  }
  if(recording)composeFrame();
  requestAnimationFrame(loop);
}
// тап по окну — сердечки из этого места
cv.addEventListener("pointerdown",e=>{
  if(paired&&(remoteV.paused||needUnmute)){needUnmute=false;remoteV.muted=false;remoteV.play().catch(()=>{})}
  const v=tileAt(e.clientX,e.clientY);
  const p=fromScreen(v,e.clientX,e.clientY);
  if(v===selfV)myKiss(p.x,p.y);
  else{burstAt(remoteV,p.x,p.y);send({t:"k",o:"r",x:p.x,y:p.y})}
});

/* ================= ВДВОЁМ: СВЯЗЬ ================= */
// Как устроена защита комнаты (см. SECURITY.md, статьи 4–5):
// ссылка = #r-<номер>.<секрет>. Номер нужен серверу связи, секрет — только этим двум телефонам.
// Пока стороны не докажут друг другу знание секрета, не передаются ни видео, ни голос, ни сердечки.
// Доказательство привязано к отпечаткам ключей шифрования, поэтому сервер связи не может встать посередине.
let peer=null,conn=null,call=null,paired=false,roomId=null,roomSecret=null,localStream=null,isHost=false;
let hmacKey=null,myCert=null,myFp=null,peerFp=null,authed=false,authedPeer=null;
const ALPH="abcdefghijkmnpqrstuvwxyz23456789"; // 32 символа, без похожих l/o/0/1
function randStr(n){const b=new Uint8Array(n);crypto.getRandomValues(b);let s="";for(const x of b)s+=ALPH[x&31];return s}
const te=new TextEncoder();
const hex=buf=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function hmac(msg){return hex(await crypto.subtle.sign("HMAC",hmacKey,te.encode(msg)))}
function eqStr(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function sdpFp(sdp){const m=/a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/.exec(sdp||"");return m?m[1].toUpperCase():null}
async function prepareCrypto(){
  hmacKey=await crypto.subtle.importKey("raw",te.encode("chmok-room-v1|"+roomSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  // один сертификат на все соединения этого телефона: его отпечаток и проверяем
  myCert=await RTCPeerConnection.generateCertificate({name:"ECDSA",namedCurve:"P-256"});
  const f=(myCert.getFingerprints?.()||[]).find(x=>x.algorithm==="sha-256");
  if(f)myFp=f.value.toUpperCase();
  else{
    // старые Safari не умеют getFingerprints: узнаём отпечаток из пробного предложения соединения
    const pc=new RTCPeerConnection({certificates:[myCert]});
    try{pc.createDataChannel("x");const o=await pc.createOffer();myFp=sdpFp(o.sdp)}finally{pc.close()}
  }
  if(!myFp)throw new Error("no-fp");
}

function setStatus(text,ok){const s=$("status");s.textContent=text;s.classList.toggle("ok",!!ok);s.hidden=recording}
function send(msg){try{if(authed&&conn&&conn.open)conn.send(msg)}catch{}}

// ---- проверка входящих сообщений: только известные типы, только правильные поля, с лимитом частоты ----
const rate={t:0,n:0,k:0};
function allow(type){
  const now=performance.now();
  if(now-rate.t>1000){rate.t=now;rate.n=0;rate.k=0}
  rate.n++;if(type==="k")rate.k++;
  return rate.n<=30&&rate.k<=6;
}
const isNum01=v=>typeof v==="number"&&isFinite(v)&&v>=-0.5&&v<=1.5;
const isHex=(v,n)=>typeof v==="string"&&v.length===n&&/^[0-9a-f]+$/.test(v);
const isFpStr=v=>typeof v==="string"&&v.length<=200&&/^[0-9A-F:]+$/.test(v);

let lastSeen=0,busy=false;
setInterval(()=>{
  if(!conn||!authed)return;
  send({t:"hb"});
  if(paired&&performance.now()-lastSeen>7000)dropPartner("lost");
},2000);

function onAuthedMsg(m){
  if(!allow(m.t))return;
  if(m.t==="hb")return;
  if(m.t==="go"){if(!isHost)startCall();return}
  if(m.t==="busy"){busy=true;setStatus("В комнате уже двое");flash("В этой комнате уже двое. Попроси новую ссылку",8000);return}
  if(m.t==="rec"){if(typeof m.on==="boolean")$("peerRec").hidden=!m.on;return}
  if(m.t==="k"){
    if((m.o!=="s"&&m.o!=="r")||!isNum01(m.x)||!isNum01(m.y))return;
    if(m.o==="s"){if(paired)burstAt(remoteV,m.x,m.y);try{navigator.vibrate?.(40)}catch{}}
    else burstAt(selfV,m.x,m.y);
  }
}

// ---- рукопожатие по секрету на канале данных ----
function attachConn(c){
  const st={myNonce:randStr(26),peerNonce:null,sentProof:false,ok:false,peerOk:false};
  c.__st=st;
  const fail=why=>{
    try{c.close()}catch{}
    if(conn===c){conn=null;authed=false}
    if(why==="bad"){flash(isHost?"Кто-то без правильной ссылки пытался зайти. Его не пустило":"Собеседник не прошёл проверку. Попроси новую ссылку",8000);if(!isHost)setStatus("Не удалось проверить собеседника")}
  };
  const timer=setTimeout(()=>{if(!st.ok)fail("timeout")},12000);
  const peerSeenFp=()=>sdpFp(c.peerConnection?.remoteDescription?.sdp);
  const myRole=isHost?"h":"g", peerRole=isHost?"g":"h";
  const proofMsg=(role,aNonce,bNonce,fpA,fpB)=>["proof",role,aNonce,bNonce,fpA,fpB].join("|");
  async function sendProof(){
    if(st.sentProof||!st.peerNonce)return;
    const pf=peerSeenFp();if(!pf){fail("bad");return}
    st.sentProof=true;
    // доказываю: знаю секрет, мой ключ шифрования — myFp, ключ собеседника вижу как pf
    c.send({t:"proof",h:await hmac(proofMsg(myRole,st.peerNonce,st.myNonce,myFp,pf))});
  }
  c.on("open",()=>{lastSeen=performance.now();try{c.send({t:"hello",n:st.myNonce})}catch{}});
  c.on("data",async m=>{
    if(!m||typeof m!=="object"||typeof m.t!=="string")return;
    lastSeen=performance.now();
    if(st.ok){if(conn===c)onAuthedMsg(m);return}
    if(m.t==="go"){st.goEarly=true;return}
    if(m.t==="hello"){
      if(st.peerNonce||typeof m.n!=="string"||!/^[a-z2-9]{26}$/.test(m.n)){fail("bad");return}
      st.peerNonce=m.n;sendProof();return;
    }
    if(m.t==="proof"){
      if(!st.peerNonce||!isHex(m.h,64)){fail("bad");return}
      const pf=peerSeenFp();if(!pf){fail("bad");return}
      // собеседник подписал свой отпечаток и мой (как он его видит); сверяю с тем, что вижу я
      const want=await hmac(proofMsg(peerRole,st.myNonce,st.peerNonce,pf,myFp));
      if(!eqStr(want,m.h)){fail("bad");return}
      clearTimeout(timer);
      if(isHost&&authed&&conn&&conn!==c&&conn.open){
        // в комнате уже есть проверенный собеседник: второго не пускаем
        try{c.send({t:"busy"})}catch{};setTimeout(()=>{try{c.close()}catch{}},800);return;
      }
      if(conn&&conn!==c){try{conn.close()}catch{}}
      st.ok=true;conn=c;authed=true;authedPeer=c.peer;peerFp=pf;busy=false;
      await sendProof();
      onAuthed();
      // хозяин проверил гостя → разрешает начать видео; гость, получив «go» раньше своей проверки, начинает сейчас
      if(isHost)send({t:"go"});
      else if(st.goEarly)startCall();
    }
  });
  c.on("close",()=>{clearTimeout(timer);if(conn===c){conn=null;authed=false;dropPartner()}});
  c.on("error",()=>{});
}
function onAuthed(){
  setStatus(isHost?"Она подключается…":"Соединяю видео…");
  $("invite").hidden=true;
  if(recording)send({t:"rec",on:true});
}
// видео начинает гость — только когда обе стороны проверили друг друга
function startCall(){
  if(isHost||!authed||!localStream||(call&&call.open))return;
  attachCall(peer.call(authedPeer,localStream));
}

function setPaired(on){
  paired=on;document.body.classList.toggle("paired",on);
  $("invite").hidden=on||!roomId||!isHost||authed;
  if(!on)$("peerRec").hidden=true;
  setStatus(on?"На связи":(authed?"Соединяю видео…":"Ждём её…"),on);
}
let needUnmute=false;
function playRemote(){
  remoteV.muted=false;
  remoteV.play().catch(()=>{
    remoteV.muted=true;needUnmute=true;
    remoteV.play().catch(()=>{});
    flash("Нажми на экран, чтобы включить её звук",8000);
  });
}
function attachCall(c){
  if(call&&call!==c){try{call.close()}catch{}}
  call=c;
  let gotStream=false,connected=false,fpOk=false,dropTimer=0;
  const checkFp=()=>{
    if(fpOk||call!==c)return;
    const sdp=c.peerConnection?.remoteDescription?.sdp;if(!sdp)return;
    // ключ шифрования видео должен совпасть с проверенным ключом собеседника
    if(eqStr(sdpFp(sdp)||"",peerFp||"x")){fpOk=true;goLive()}
    else{flash("Видео пришло не от неё — соединение разорвано",8000);dropPartner("bad")}
  };
  const goLive=()=>{
    if(call!==c||paired||!gotStream||!connected||!fpOk)return;
    failCount=0;setPaired(true);
    playRemote();
    flash("Вы на связи! Чмокайте 💋");
  };
  const watch=pc=>{
    if(!pc||pc.__watched)return;pc.__watched=true;
    mediaPC=pc;cand={host:0,srflx:0,relay:0};
    pc.addEventListener("icecandidate",e=>{const t=e.candidate?.type||(/ typ (\w+)/.exec(e.candidate?.candidate||"")||[])[1];if(t&&t in cand)cand[t]++});
    pc.addEventListener("signalingstatechange",checkFp);
    const st=()=>pc.iceConnectionState;
    pc.addEventListener("iceconnectionstatechange",()=>{
      if(call!==c)return;
      checkFp();
      if(st()==="connected"||st()==="completed"){connected=true;clearTimeout(dropTimer);goLive()}
      else if(st()==="disconnected"){clearTimeout(dropTimer);dropTimer=setTimeout(()=>{if(call===c&&st()!=="connected"&&st()!=="completed")dropPartner("lost")},6000)}
      else if(st()==="failed")dropPartner("failed");
    });
    if(st()==="connected"||st()==="completed")connected=true;
    checkFp();
  };
  watch(c.peerConnection);
  c.on("stream",st=>{
    lastSeen=performance.now();
    watch(c.peerConnection);checkFp();
    remoteV.srcObject=st;
    feedRecording("remote",st);
    gotStream=true;
    goLive();
    setTimeout(()=>{if(call===c&&!connected)dropPartner("failed")},30000);
  });
  c.on("close",()=>{if(call===c){call=null;dropPartner()}});
  c.on("error",()=>{});
}
let failCount=0,mediaPC=null,cand={host:0,srflx:0,relay:0},via="—";
// строка состояния для отладки (без секрета): по скриншоту видно, на каком шаге застряло
async function updDiag(){
  const d=$("diag");if(!roomId){d.hidden=true;return}
  d.hidden=recording;
  const ice=mediaPC?mediaPC.iceConnectionState:"—";
  if(mediaPC&&(ice==="connected"||ice==="completed")){
    try{const st=await mediaPC.getStats();let pair=null;st.forEach(r=>{if(r.type==="candidate-pair"&&(r.nominated||r.selected)&&r.state==="succeeded")pair=r});
      if(pair){const l=st.get(pair.localCandidateId);via=l?.candidateType==="relay"?"ретранслятор":"напрямую"}}catch{}
  }
  d.textContent=`v${VER} · ${isHost?"создал":"гость"} · сервер:${peer&&!peer.disconnected?"ок":"нет"} · проверка:${authed?"ок":"нет"} · видео:${ice} · кандидаты ${cand.host}/${cand.srflx}/${cand.relay} · ${via} · кадр:${remoteV.videoWidth||0}`;
}
setInterval(updDiag,1000);
function dropPartner(why){
  if(!paired&&!call&&!conn)return;
  if(why==="failed"){
    failCount++;
    flash(failCount>=2?"Видео не проходит между вашими сетями. Попробуйте подключиться обоим к Wi-Fi или одному с мобильного интернета":"Не удалось соединить видео, пробую ещё раз…",8000);
  }else if(why==="lost")flash("Связь прервалась, переподключаюсь…");
  try{call?.close()}catch{};try{conn?.close()}catch{}
  call=null;conn=null;authed=false;authedPeer=null;peerFp=null;remoteV.srcObject=null;
  setPaired(false);
  if(busy){$("invite").hidden=true;setStatus("В комнате уже двое");setTimeout(()=>{busy=false;connectToHost()},10000);return}
  if(!isHost){setStatus("Переподключаюсь…");setTimeout(connectToHost,failCount>=2?6000:1500)}
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

// Серверы связи и ретрансляторы — только из белого списка SECURITY.md, статья 6. Ссылка их менять не может.
const PEER_SERVER={host:"0.peerjs.com",port:443,path:"/",secure:true};
const TURN_HOST="staticauth.openrelay.metered.ca", TURN_SECRET="openrelayprojectsecret";
const STUN=[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun.cloudflare.com:3478"}];
const LEGACY_TURN={urls:["turn:openrelay.metered.ca:80","turn:openrelay.metered.ca:443?transport=tcp"],username:"openrelayproject",credential:"openrelayproject"};
let ICE=STUN;
async function buildIce(){
  try{
    const username=(Math.floor(Date.now()/1000)+12*3600)+":chmok";
    const key=await crypto.subtle.importKey("raw",te.encode(TURN_SECRET),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
    const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,te.encode(username)));
    const credential=btoa(String.fromCharCode(...sig));
    return [...STUN,{urls:[
      "turn:"+TURN_HOST+":80",
      "turn:"+TURN_HOST+":80?transport=tcp",
      "turn:"+TURN_HOST+":443",
      "turns:"+TURN_HOST+":443?transport=tcp"
    ],username,credential},LEGACY_TURN];
  }catch{return [...STUN,LEGACY_TURN]}
}
function peerOptions(){return {...PEER_SERVER,config:{iceServers:ICE,certificates:[myCert]}}}
function roomLink(){return location.origin+location.pathname+"#r-"+roomId+"."+roomSecret}

// Кто первым открыл комнату, тот её «держит»; второй подключается к нему
function openRoom(){
  return new Promise(res=>{
    const p=new Peer(ROOM_PREFIX+roomId,peerOptions());
    p.on("open",()=>{peer=p;isHost=true;res(true)});
    p.on("error",e=>{
      if(e.type==="unavailable-id"){try{p.destroy()}catch{};res(false);return}
      if(peer===p)handlePeerError(e);else{try{p.destroy()}catch{};res(null)}
    });
    const pending=new Set();
    p.on("connection",c=>{
      // не больше трёх непроверенных подключений одновременно
      for(const x of pending)if(x.__st?.ok)pending.delete(x);
      if(pending.size>=3){try{c.close()}catch{};return}
      pending.add(c);c.on("close",()=>pending.delete(c));
      attachConn(c);
    });
    p.on("call",c=>{
      // видео принимаем только от того, кто прошёл проверку
      if(!authed||c.peer!==authedPeer||(paired&&call)){try{c.close()}catch{};return}
      c.answer(localStream);attachCall(c);
    });
    p.on("disconnected",()=>{try{p.reconnect()}catch{}});
  });
}
function joinAsGuest(){
  return new Promise(res=>{
    const p=new Peer(peerOptions());
    p.on("open",()=>{peer=p;isHost=false;res(true);connectToHost()});
    p.on("error",e=>{if(peer===p)handlePeerError(e);else res(null)});
    p.on("disconnected",()=>{try{p.reconnect()}catch{}});
  });
}
function connectToHost(){
  if(!peer||isHost||paired)return;
  attachConn(peer.connect(ROOM_PREFIX+roomId,{reliable:true}));
}
function handlePeerError(e){
  if(e.type==="peer-unavailable"){
    // хозяин комнаты пропал: занимаем комнату сами и ждём
    try{peer.destroy()}catch{}
    peer=null;
    setStatus("Ждём её…");
    openRoom().then(ok=>{if(ok===false)joinAsGuest()});
    return;
  }
  if(e.type==="network"||e.type==="server-error"||e.type==="socket-error"){setStatus("Нет связи с сервером, пробую ещё раз…");return}
  setStatus("Ошибка связи: "+e.type);
}
async function startRoom(){
  if(linkRoom){roomId=linkRoom.id;roomSecret=linkRoom.secret}
  else{roomId=randStr(10);roomSecret=randStr(26);history.replaceState(null,"",location.pathname+"#r-"+roomId+"."+roomSecret)}
  setStatus("Подключаюсь…");$("status").hidden=false;
  try{await prepareCrypto()}catch{setStatus("Браузер слишком старый для защищённой связи. Обнови его");return}
  const [ice]=await Promise.all([buildIce(),loadScript("vendor/peerjs.min.js")]);
  ICE=ice;
  $("roomUrl").textContent=roomLink();
  $("linkBtn").hidden=false;
  let ok=await openRoom();
  if(ok===false)ok=await joinAsGuest();
  if(ok===null){setStatus("Не получилось подключиться. Обнови страницу");return}
  setPaired(false);
  if(!isHost)setStatus("Подключаюсь к ней…");
}
async function shareRoom(){
  const url=roomLink();
  try{if(navigator.share){await navigator.share({title:"Чмок 💋",text:"Заходи чмокаться 💋",url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(url);flash("Ссылка скопирована, отправь её в Telegram")}
  catch{flash("Скопируй ссылку из окошка и отправь в Telegram")}
}
$("shareLink").addEventListener("click",shareRoom);
$("linkBtn").addEventListener("click",shareRoom);
$("leave").addEventListener("click",()=>{
  try{call?.close();conn?.close();peer?.destroy()}catch{}
  localStream?.getTracks().forEach(t=>t.stop());
  location.href=location.pathname;
});
addEventListener("pagehide",()=>{try{peer?.destroy()}catch{};localStream?.getTracks().forEach(t=>t.stop())});

/* ================= ЗАПИСЬ ================= */
// Во время записи склеиваем на один холст то, что видно на экране: камеры + сердечки
const rc=document.createElement("canvas"),rctx=rc.getContext("2d");
function composeFrame(){
  const k=rc.width/W;
  rctx.fillStyle="#14060f";rctx.fillRect(0,0,rc.width,rc.height);
  const tiles=paired?[remoteV,selfV]:[selfV];
  for(const v of tiles){
    if(!v.videoWidth)continue;
    const g=tileGeom(v);
    const x=g.r.left*k,y=g.r.top*k,w=g.r.width*k,h=g.r.height*k;
    rctx.save();
    rctx.beginPath();
    const rad=v===selfV&&paired&&g.r.width<W*0.45?18*k:0;
    if(rctx.roundRect)rctx.roundRect(x,y,w,h,rad);else rctx.rect(x,y,w,h);
    rctx.clip();
    const dw=g.dw*k,dh=g.dh*k,ox=x+(w-dw)/2,oy=y+(h-dh)/2;
    if(g.mirror){rctx.translate(x+w,0);rctx.scale(-1,1);rctx.drawImage(v,(x+w)-(ox+dw),oy,dw,dh)}
    else rctx.drawImage(v,ox,oy,dw,dh);
    rctx.restore();
    if(rad){rctx.lineWidth=2*k;rctx.strokeStyle="rgba(255,255,255,.85)";rctx.beginPath();rctx.roundRect?rctx.roundRect(x,y,w,h,rad):rctx.rect(x,y,w,h);rctx.stroke()}
  }
  rctx.drawImage(cv,0,0,rc.width,rc.height);
}
let rec=null,chunks=[],recStart=0,timerId=0,lastFile=null,lastURL=null,recording=false;
function pickType(){
  const list=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4;codecs=avc1,mp4a","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  return list.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||"";
}
function startRec(){
  initAudio();if(ac.state==="suspended")ac.resume();
  const long=720;const s=long/Math.max(W,H);
  rc.width=Math.round(W*s/2)*2;rc.height=Math.round(H*s/2)*2;
  composeFrame();
  const stream=rc.captureStream(30);
  recDest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr));
  const type=pickType();
  try{rec=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:3_000_000}:undefined)}
  catch{flash("Этот браузер не умеет записывать видео. Попробуй Chrome или Safari.");return}
  chunks=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  rec.onstop=finishRec;
  rec.start(250);recording=true;
  send({t:"rec",on:true});
  recStart=performance.now();
  $("rec").classList.add("on");$("rec").setAttribute("aria-label","Остановить запись");
  $("topbar").hidden=false;$("timer").hidden=false;$("status").hidden=true;$("hint").hidden=true;
  timerId=setInterval(()=>{const s=Math.floor((performance.now()-recStart)/1000);$("timer").textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0")},250);
}
function stopRec(){if(rec&&rec.state!=="inactive")rec.stop()}
function finishRec(){
  recording=false;
  send({t:"rec",on:false});
  clearInterval(timerId);$("timer").hidden=true;$("timer").textContent="0:00";$("status").hidden=!roomId;
  $("rec").classList.remove("on");$("rec").setAttribute("aria-label","Начать запись");
  const type=(rec.mimeType||"video/webm").split(";")[0];
  const ext=type.includes("mp4")?"mp4":"webm";
  const blob=new Blob(chunks,{type});
  const stamp=new Date().toTimeString().slice(0,5).replace(":","-");
  lastFile=new File([blob],`chmok-${stamp}.${ext}`,{type});
  if(lastURL)URL.revokeObjectURL(lastURL);
  lastURL=URL.createObjectURL(blob);
  const pv=$("preview");pv.src=lastURL;pv.play().catch(()=>{});
  $("save").href=lastURL;$("save").download=lastFile.name;
  const canShare=!!(navigator.canShare&&navigator.canShare({files:[lastFile]}));
  $("share").hidden=!canShare;$("shareNote").hidden=canShare;
  $("sheet").hidden=false;$("dock").hidden=true;
}
$("rec").addEventListener("click",()=>{recording?stopRec():startRec()});
$("share").addEventListener("click",async()=>{
  try{await navigator.share({files:[lastFile],title:"Чмок 💋"})}
  catch(e){if(e.name!=="AbortError")$("shareNote").hidden=false}
});
$("again").addEventListener("click",()=>{$("preview").pause();$("sheet").hidden=true;$("dock").hidden=false});

/* ================= СТАРТ ================= */
if(linkRoom){
  $("introText").textContent="Тебя зовут чмокаться 💋 Нажми «Войти», разреши камеру и микрофон, и вы увидите друг друга.";
  $("introBtns").hidden=true;$("joinBtns").hidden=false;
}else if(oldLink){
  $("introText").textContent="Эта ссылка от старой версии без защиты, по ней войти нельзя. Попроси новую ссылку или создай комнату сам.";
}
const inTelegram=/Telegram/i.test(navigator.userAgent)||!!window.TelegramWebviewProxy;
if(inTelegram){
  // Кнопку «Открыть в Chrome» убрали: она передавала бы ключ комнаты в адресе на сервер (статья 4).
  // Меню Telegram открывает ссылку целиком, вместе с ключом после #.
  $("tgBox").hidden=false;
  ["goPair","goJoin"].forEach(id=>$(id).classList.add("ghost"));
  $("intro").insertBefore($("tgBox"),$("introBtns"));
}
function withTimeout(pr,ms){return Promise.race([pr,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error("timeout"),{name:"Timeout"})),ms))])}
// Пробуем по очереди: камера+микрофон → попроще → только камера. Некоторые телефоны и встроенные браузеры не дают микрофон.
async function getCamera(pair){
  const tries=pair?[
    {video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:{echoCancellation:true,noiseSuppression:true}},
    {video:true,audio:true},
    {video:{facingMode:"user"},audio:false},
    {video:true,audio:false}
  ]:[
    {video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}},audio:false},
    {video:true,audio:false}
  ];
  if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error("no api"),{name:"NoApi"});
  let last;
  for(const c of tries){
    try{return await withTimeout(navigator.mediaDevices.getUserMedia(c),15000)}
    catch(e){last=e;if(e.name==="Timeout"||e.name==="NotFoundError")break}
  }
  throw last;
}
function cameraError(e,pair){
  const n=e?.name||"";
  if(inTelegram||n==="NoApi")return "Встроенный браузер Telegram не даёт камеру. Нажми ⋮ вверху справа → «Открыть в браузере» и попробуй там.";
  if(n==="Timeout")return "Браузер так и не спросил разрешение на камеру. Открой ссылку в Chrome и попробуй ещё раз.";
  if(n==="NotAllowedError"||n==="SecurityError")return "Доступ к камере"+(pair?" и микрофону":"")+" запрещён. Нажми на значок слева от адреса сайта → Разрешения → включи камеру"+(pair?" и микрофон":"")+", потом обнови страницу.";
  if(n==="NotReadableError"||n==="AbortError")return "Камера занята другим приложением (например, звонком или камерой). Закрой его и попробуй снова.";
  if(n==="NotFoundError"||n==="OverconstrainedError")return "Не нашлась фронтальная камера.";
  return "Камера не включилась ("+(n||"ошибка")+"). Попробуй обновить страницу или открыть её в Chrome.";
}
// модель скачивается с сервера Google и используется, только если её отпечаток совпадает с записанным
async function loadModel(){
  const buf=await (await fetch(MODEL,{credentials:"omit",referrerPolicy:"no-referrer"})).arrayBuffer();
  const h=hex(await crypto.subtle.digest("SHA-256",buf));
  if(h!==MODEL_SHA256)throw new Error("model-hash");
  return new Uint8Array(buf);
}
async function start(mode,btn){
  if(oldLink)history.replaceState(null,"",location.pathname); // по старой ссылке не входим — создаём новую комнату
  const err=$("err");err.hidden=true;
  const btns=document.querySelectorAll(".card .btn");
  btns.forEach(b=>b.disabled=true);
  const label=btn?.textContent;if(btn)btn.textContent="Включаю камеру…";
  try{initAudio();ac.resume()}catch{}
  const pair=mode!=="solo";
  maxFaces=pair?1:2;
  try{
    localStream=await getCamera(pair);
    selfV.srcObject=localStream;selfV.play().catch(()=>{});
  }catch(e){
    btns.forEach(b=>b.disabled=false);if(btn)btn.textContent=label;
    err.textContent=cameraError(e,pair);err.hidden=false;return;
  }
  const noVoice=pair&&!localStream.getAudioTracks().length;
  if(pair)feedRecording("me",localStream);
  $("intro").hidden=true;$("dock").hidden=false;$("topbar").hidden=false;
  flash(noVoice?"Микрофон не дали, поэтому звонок будет без твоего голоса. Сердечки работают":"Загружаю распознавание лица… Тап по экрану уже выпускает сердечки",noVoice?7000:4000);
  if(!running){running=true;requestAnimationFrame(loop)}
  const saved=await loadSound();
  if(saved){try{customBuf=await decode(saved.buf);showSoundState(saved.name)}catch{}}
  if(pair)startRoom().catch(()=>setStatus("Не загрузилась связь. Проверь интернет"));
  else{$("leave").textContent="Назад"}
  try{
    const [{FaceLandmarker,FilesetResolver},model]=await Promise.all([import(VISION+"vision_bundle.mjs"),loadModel()]);
    const files=await FilesetResolver.forVisionTasks(VISION+"wasm");
    const opts=d=>({baseOptions:{modelAssetBuffer:model,delegate:d},runningMode:"VIDEO",numFaces:maxFaces,outputFaceBlendshapes:true});
    try{landmarker=await FaceLandmarker.createFromOptions(files,opts("GPU"))}
    catch{landmarker=await FaceLandmarker.createFromOptions(files,opts("CPU"))}
    flash("Готово, чмокай!");
  }catch(e){flash(e?.message==="model-hash"?"Файл распознавания лица не прошёл проверку, поэтому выключен. Тапом сердечки работают.":"Не загрузилось распознавание лица. Проверь интернет. Тапом сердечки работают.",8000)}
}
$("goPair").addEventListener("click",e=>start("pair",e.currentTarget));
$("goJoin").addEventListener("click",e=>start("pair",e.currentTarget));
$("goSolo").addEventListener("click",e=>start("solo",e.currentTarget));
