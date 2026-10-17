// Проверка ретрансляторов из белого списка SECURITY.md (статья 6)
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
  if(!(window.RELAY&&window.RELAY.username)){document.getElementById("sum").textContent="Логин ретранслятора ещё не задан";}
  const r=window.RELAY||{};
  const c={username:r.username,credential:r.credential};
  const H=r.host||"global.relay.metered.ca";
  const tests=[
    ["STUN Google (прямое соединение)",{urls:"stun:stun.l.google.com:19302"},false,"srflx"],
    ["STUN Metered",{urls:"stun:stun.relay.metered.ca:80"},false,"srflx"],
    ["Metered UDP 80",{urls:"turn:"+H+":80",...c},true,"relay"],
    ["Metered TCP 80",{urls:"turn:"+H+":80?transport=tcp",...c},true,"relay"],
    ["Metered UDP 443",{urls:"turn:"+H+":443",...c},true,"relay"],
    ["Metered TLS 443",{urls:"turns:"+H+":443?transport=tcp",...c},true,"relay"]
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
  const relays=out.filter(o=>o.ok&&o.name.startsWith("Metered"));
  document.getElementById("sum").textContent=relays.length?"Ретранслятор доступен: "+relays.map(r=>r.name).join(", "):"Ни один ретранслятор не доступен из этой сети";
  document.getElementById("sum").className=relays.length?"ok":"bad";
  window.__result=out;console.log("[turntest]",JSON.stringify(out));
})();
