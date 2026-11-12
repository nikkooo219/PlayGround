(() => {
  const $ = (id) => document.getElementById(id);
  const cams = [
    { id: 1, name: 'SHOW STAGE', x: 49, y: 17, flavor: 'A dusty stage. The curtains never quite close.' },
    { id: 2, name: 'DINING AREA', x: 28, y: 29, flavor: 'Tables set for a party that never came.' },
    { id: 3, name: 'ATTRACTION HALL', x: 70, y: 31, flavor: 'The corridor bends out of sight.' },
    { id: 4, name: 'SUPPLY CLOSET', x: 20, y: 52, flavor: 'Old props lean against the wall.' },
    { id: 5, name: 'WEST HALL', x: 45, y: 45, flavor: 'A long hall. Something moved at the end.' },
    { id: 6, name: 'EAST HALL', x: 75, y: 52, flavor: 'The static here sounds almost like breathing.' },
    { id: 7, name: 'PARTS & SERVICE', x: 34, y: 73, flavor: 'Rust, wires, and something that should be dead.' },
    { id: 8, name: 'VENT ACCESS', x: 65, y: 76, flavor: 'A narrow passage into the ventilation system.' }
  ];
  const routes = { 1:[2,3],2:[4,5],3:[5,6],4:[7],5:[7,8],6:[8],7:[8,'office'],8:[5,'office'] };
  const state = {
    started:false, lost:false, won:false, monitor:false, night:1, hour:0, seconds:0,
    selected:1, threat:5, load:100, vent:100, audio:true, ventilation:true, cameras:true,
    audioCooldown:0, rebooting:false, rebootLeft:0, phantomTimer:0, scareTimer:0,
    elapsed:0, hourLength:30, moveTimer:0, moveInterval:13, lastMinute:0
  };
  let tickId = null, audioCtx = null, toastTimer = null;

  function buildCameraUI() {
    const list = $('camera-list'); const map = $('map');
    cams.forEach(cam => {
      const button = document.createElement('button');
      button.className = 'camera-btn'; button.dataset.cam = cam.id;
      button.textContent = `CAM 0${cam.id} · ${cam.name}`;
      button.addEventListener('click', () => selectCamera(cam.id));
      list.appendChild(button);
      const node = document.createElement('button');
      node.className = 'map-node'; node.dataset.cam = cam.id;
      node.style.left = `${cam.x}%`; node.style.top = `${cam.y}%`; node.textContent = `0${cam.id}`;
      node.addEventListener('click', () => selectCamera(cam.id)); map.appendChild(node);
    });
  }
  function selectCamera(id) {
    state.selected = id;
    document.querySelectorAll('.camera-btn,.map-node').forEach(el => el.classList.toggle('active', Number(el.dataset.cam) === id));
    const cam = cams[id-1];
    $('cam-name').textContent = `CAM 0${id} · ${cam.name}`;
    $('feed').classList.remove('glitch');
    if (state.threat === id) $('cam-time').textContent = 'MOTION DETECTED · SIGNAL STRENGTH 74%';
    else $('cam-time').textContent = `SIGNAL STRENGTH ${Math.max(58,99-Math.floor(Math.random()*9))}% · ${cam.flavor}`;
    $('springtrap').classList.toggle('present', state.threat === id && state.cameras);
    if (!state.cameras) showPhantom('CAMERA SYSTEM OFFLINE');
    updateMap();
  }
  function updateMap() {
    document.querySelectorAll('.map-node').forEach(node => node.classList.toggle('active',Number(node.dataset.cam)===state.selected));
    $('threat-status').innerHTML = `MOTION: <b>${state.threat==='office'?'AT YOUR DOOR':state.threat===state.selected?'ON CAM 0'+state.threat:'UNDETECTED'}</b>`;
    $('office-threat').classList.toggle('visible',state.threat==='office'&&!state.monitor);
  }
  function updateSystems() {
    $('audio-state').textContent = state.audio ? (state.audioCooldown>0?'PLAYING · '+Math.ceil(state.audioCooldown)+'S':'ONLINE · READY') : 'OFFLINE · REBOOT';
    $('vent-state').textContent = state.ventilation ? `ONLINE · ${Math.round(state.vent)}%` : 'OFFLINE · REBOOT';
    $('reboot-state').textContent = state.rebooting ? `REBOOTING · ${Math.ceil(state.rebootLeft)}S` : 'ALL SYSTEMS';
    $('audio-btn').classList.toggle('danger',!state.audio);
    $('vent-btn').classList.toggle('danger',!state.ventilation || state.vent<35);
    $('reboot-btn').classList.toggle('danger',!state.cameras||!state.audio||!state.ventilation);
    $('power-value').textContent = `${Math.max(0,Math.round(state.load))}%`;
    $('power-bar').style.width = `${Math.max(0,state.load)}%`;
    $('power-bar').style.background = state.load<28?'#d4513f':'#bdc95c';
    $('office-status').textContent = !state.ventilation?'VENTILATION FAILURE':!state.audio?'AUDIO DEVICE OFFLINE':!state.cameras?'CAMERAS OFFLINE':'ALL SYSTEMS NOMINAL';
    $('clock').textContent = state.hour===0?'12 AM':`${state.hour} AM`;
    $('night-num').textContent = String(state.night).padStart(2,'0');
  }
  function showPhantom(message) {
    const el=$('phantom'); el.textContent=message; el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),900);
  }
  function toast(message) {
    $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100);
  }
  function sound(freq=180,duration=.12,type='sine',volume=.035) {
    try {
      audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended') audioCtx.resume();
      const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
      osc.type=type; osc.frequency.value=freq; gain.gain.setValueAtTime(volume,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
      osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);
    } catch(e) { /* audio is optional */ }
  }
  function toggleMonitor(force) {
    if(!state.started||state.lost||state.won)return;
    state.monitor=force===undefined?!state.monitor:force;
    $('monitor').classList.toggle('open',state.monitor);
    $('office').style.opacity=state.monitor?'0':'1';
    if(state.monitor){sound(390,.05,'square',.012);if(!state.cameras)showPhantom('CAMERA SYSTEM OFFLINE');}
    else {sound(120,.08,'triangle',.02);$('springtrap').classList.remove('present');}
    updateMap();
  }
  function playAudio() {
    if(!state.started||state.lost||state.won)return;
    if(!state.audio){toast('AUDIO DEVICE OFFLINE · REBOOT SYSTEMS');return;}
    if(state.audioCooldown>0){toast('AUDIO LURE RECHARGING');return;}
    state.audioCooldown=6; sound(420,.32,'sine',.04);setTimeout(()=>sound(320,.28,'sine',.035),130);
    // The lure works from any camera. It relocates the threat to the selected room.
    if(state.threat==='office'||state.threat!==state.selected){state.threat=state.selected;state.moveTimer=0;toast('AUDIO LURE PLAYED · CAM 0'+state.selected);}
    else {toast('LURE PLAYED · IT HEARD YOU');state.moveTimer=0;}
    if(state.monitor)selectCamera(state.selected);updateMap();
  }
  function reboot() {
    if(!state.started||state.lost||state.won||state.rebooting)return;
    state.rebooting=true;state.rebootLeft=4.5;state.cameras=false;state.audio=false;state.ventilation=false;
    toast('REBOOT SEQUENCE STARTED');sound(90,.2,'sawtooth',.025);updateSystems();
  }
  function moveThreat() {
    if(state.threat==='office'){lose();return;}
    const opts=routes[state.threat]||[5];
    let next;
    // A functioning lure can keep pulling the creature away; failures make it bolder.
    if(state.audioCooldown>0 && Math.random()<.78) next=state.selected;
    else if(!state.ventilation && Math.random()<.45) next='office';
    else if(Math.random()<.13) next=state.threat;
    else next=opts[Math.floor(Math.random()*opts.length)];
    state.threat=next;
    state.moveTimer=0;
    if(next==='office') { sound(54,.7,'sawtooth',.09);toast('WARNING · MOVEMENT IN THE OFFICE'); }
    else if(next===state.selected){sound(82,.2,'triangle',.04);if(state.monitor)toast(`MOTION DETECTED · CAM 0${next}`);}
    else if(Math.random()<.45) sound(45,.2,'sine',.018);
    if(!state.monitor&&next==='office') $('office-threat').classList.add('visible');
    if(state.monitor)selectCamera(state.selected);updateMap();
  }
  function lose() {
    if(state.lost||state.won)return;
    state.lost=true;state.monitor=false;$('monitor').classList.remove('open');$('office').style.opacity='1';
    $('jumpscare').classList.add('show');sound(65,.9,'sawtooth',.12);setTimeout(()=>sound(47,.8,'square',.09),170);
    if(tickId){clearInterval(tickId);tickId=null;}
  }
  function win() {
    if(state.won||state.lost)return;
    state.won=true;state.monitor=false;$('monitor').classList.remove('open');$('office').style.opacity='1';
    $('win').classList.add('show');sound(523,.5,'sine',.055);setTimeout(()=>sound(659,.7,'sine',.055),180);
    if(tickId){clearInterval(tickId);tickId=null;}
  }
  function startNight(night=1) {
    state.started=true;state.lost=false;state.won=false;state.night=night;state.hour=0;state.seconds=0;state.elapsed=0;
    state.monitor=false;state.threat=5;state.load=100;state.vent=100;state.audio=true;state.ventilation=true;state.cameras=true;
    state.audioCooldown=0;state.rebooting=false;state.rebootLeft=0;state.moveTimer=0;state.moveInterval=Math.max(8,13-(night-1)*.7);state.hourLength=30;
    ['intro','jumpscare','win'].forEach(id=>$(id).classList.remove('show'));
    $('monitor').classList.remove('open');$('office').style.opacity='1';selectCamera(1);updateSystems();
    if(tickId)clearInterval(tickId);tickId=setInterval(tick,1000);
  }
  function tick() {
    if(!state.started||state.lost||state.won)return;
    state.elapsed++;state.seconds=(state.seconds+1)%state.hourLength;
    if(state.seconds===0){state.hour++;sound(260,.16,'sine',.025);if(state.hour>=6){win();return;}}
    state.moveTimer++;
    if(state.audioCooldown>0)state.audioCooldown--;
    if(state.rebooting){state.rebootLeft--;if(state.rebootLeft<=0){state.rebooting=false;state.cameras=true;state.audio=true;state.ventilation=true;state.vent=100;toast('SYSTEMS RESTORED');sound(350,.2,'sine',.035);}}
    if(state.monitor)state.load-=.21; else state.load-=.06;
    if(!state.ventilation){state.vent-=.24;state.phantomTimer++;if(state.phantomTimer%8===0){showPhantom('VENTILATION ERROR');sound(58,.3,'sawtooth',.04);state.moveTimer+=2;}}
    else {state.vent=Math.min(100,state.vent+.1);state.phantomTimer=0;}
    if(state.vent<=0){state.ventilation=false;state.vent=0;}
    // Atmospheric system faults occasionally interrupt an otherwise quiet shift.
    if(!state.rebooting && state.elapsed>22 && Math.random()<.012){
      const candidates=['audio','ventilation','cameras'].filter(x=>state[x]);
      if(candidates.length){const failure=candidates[Math.floor(Math.random()*candidates.length)];state[failure]=false;toast(`${failure.toUpperCase()} ERROR · REBOOT REQUIRED`);sound(72,.3,'square',.04);}
    }
    if(state.load<=0){state.load=0;if(!state.rebooting){state.cameras=false;state.audio=false;state.ventilation=false;}}
    if(state.moveTimer>=state.moveInterval){moveThreat();state.moveInterval=Math.max(7,state.moveInterval+(Math.random()*4-1.6));}
    if(state.threat==='office'&&!state.monitor&&Math.random()<.095)state.scareTimer++;else state.scareTimer=0;
    if(state.scareTimer>=4){lose();return;}
    updateSystems();
  }
  $('start-btn').addEventListener('click',()=>startNight(1));
  $('monitor-btn').addEventListener('click',()=>toggleMonitor());
  $('lower-monitor').addEventListener('click',()=>toggleMonitor(false));
  $('audio-btn').addEventListener('click',playAudio);
  $('vent-btn').addEventListener('click',()=>{if(!state.ventilation){toast('VENTILATION OFFLINE · REBOOT SYSTEMS');return;}state.vent=100;toast('VENTILATION PURGED');sound(170,.15,'triangle',.02);updateSystems();});
  $('reboot-btn').addEventListener('click',reboot);
  $('retry-btn').addEventListener('click',()=>startNight(state.night));
  $('next-btn').addEventListener('click',()=>startNight(state.night+1));
  document.addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='Space')toggleMonitor();
    if(e.key.toLowerCase()==='a')playAudio();
    if(e.key.toLowerCase()==='v' && state.ventilation){state.vent=100;toast('VENTILATION PURGED');updateSystems();}
    if(e.key.toLowerCase()==='r')reboot();
    const num=Number(e.key);if(num>=1&&num<=8&&state.monitor)selectCamera(num);
  });
  buildCameraUI();selectCamera(1);updateSystems();
})();
