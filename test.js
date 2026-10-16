// Проверка ретрансляторов из белого списка SECURITY.md (статья 6)
const OR_HOST="staticauth.openrelay.metered.ca", OR_SECRET="openrelayprojectsecret";
async function orCred(){
  const username=(Math.floor(Date.now()/1000)+3600)+":test";
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(OR_SECRET),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(username)));
  return {username,credential:btoa(String.fromCharCode(...sig))};
}
function probe(server,relayOnly){
  return new Promise(res=>{
    const types={},errs=[];
    let pc;
    try{pc=new RTCPeerConnection({iceServers:[server],iceTransportPolicy:relayOnly?"relay":"all"})}catch(e){res({types,errs:[e.message]});return}
    pc.onicecandidate=e=>{if(e.candidate){const t=e.candidate.type||(/ typ (\w+)/.exec(e.candidate.candidate)||[])[1];if(t)types[t]=(types[t]||0)+1}};
    pc.onicecandidateerror=e=>errs.push((e.errorCode||"")+" "+(e.errorText||"")+" "+(e.url||""));
    pc.createDataChannel("x");
    pc.createOffer().then(o=>pc.setLocalDescription(o)).catch(e=>errs.push(e.message));
    const done=()=>{try{pc.close()}catch{};res({types,errs})};
    pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==="complete")setTimeout(done,100)};
    setTimeout(done,9000);
  });
}
(async()=>{
  const c=await orCred();
  const tests=[
    ["STUN Google (прямое соединение)",{urls:"stun:stun.l.google.com:19302"},false,"srflx"],
    ["Open Relay UDP 80",{urls:"turn:"+OR_HOST+":80",...c},true,"relay"],
    ["Open Relay TCP 80",{urls:"turn:"+OR_HOST+":80?transport=tcp",...c},true,"relay"],
    ["Open Relay TCP 443",{urls:"turn:"+OR_HOST+":443?transport=tcp",...c},true,"relay"],
    ["Open Relay TLS 443",{urls:"turns:"+OR_HOST+":443?transport=tcp",...c},true,"relay"],
    ["Open Relay (старые пароли) 80",{urls:"turn:openrelay.metered.ca:80",username:"openrelayproject",credential:"openrelayproject"},true,"relay"],
    ["Open Relay (старые пароли) TCP 443",{urls:"turn:openrelay.metered.ca:443?transport=tcp",username:"openrelayproject",credential:"openrelayproject"},true,"relay"]
  ];
  const t=document.getElementById("t");
  const rows=tests.map(([name])=>{const tr=t.insertRow();tr.insertCell().textContent=name;const r=tr.insertCell();r.textContent="…";return r});
  const out=await Promise.all(tests.map(([name,srv,relay,want])=>probe(srv,relay).then(r=>{
    const ok=(r.types[want]||0)>0;
    const i=tests.findIndex(x=>x[0]===name);
    rows[i].textContent=ok?"работает":"нет";rows[i].className=ok?"ok":"bad";
    if(!ok&&r.errs.length)rows[i].title=r.errs.join("\n");
    return {name,ok,types:r.types,errs:r.errs.slice(0,3)};
  })));
  const relays=out.filter(o=>o.ok&&o.name!==tests[0][0]);
  document.getElementById("sum").textContent=relays.length?"Ретранслятор доступен: "+relays.map(r=>r.name).join(", "):"Ни один ретранслятор не доступен из этой сети";
  document.getElementById("sum").className=relays.length?"ok":"bad";
  window.__result=out;console.log("[turntest]",JSON.stringify(out));
})();
