/* Atelier Kana studio: bundled reference paths, vector drafts, explicit self-practice. */
(function(){
 'use strict';
 const D=window.NP_KANA_DATA,M=window.NPKanaModel,records=new Map(D.characters.map(c=>[c.char,c])),workspaces=new Map();
 const tr=(vi,en,ja)=>typeof I==='function'?I(vi,en,ja):vi;
 const copy=v=>JSON.parse(JSON.stringify(v));
 /* Audio is a local preference only: it never updates writing evidence or learner progress. */
 const speakerSvg='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
 /* Stroke controls v2: line icons inherit current theme color. */
 const ksPaths={play:'<path d="m8 5 11 7-11 7V5Z"/>',pause:'<path d="M7 5v14M17 5v14"/>',prev:'<path d="m14 6-6 6 6 6M19 6v12"/>',next:'<path d="m10 6 6 6-6 6M5 6v12"/>',replay:'<path d="M3 11a9 9 0 1 1 2.7 6.4M3 4v7h7"/>',undo:'<path d="m9 14-5-5 5-5M4 9h9a7 7 0 0 1 0 14"/>',clear:'<path d="M7 20h13M3 14l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 7H9z"/>',check:'<path d="m4 12 5 5L20 6"/>',speed:'<circle cx="12" cy="12" r="9"/><path d="m12 12 4-4"/>'};
 const ksIcon=n=>'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+ksPaths[n]+'</svg>';
 function ksPlaybackStatus(state){const b=document.querySelector('[data-ks="play"]');if(!b)return;b.dataset.playing=String(state==='playing');const t=b.querySelector('.ks-play-label');if(t)t.textContent=state==='playing'?tr('Tạm dừng','Pause','一時停止'):state==='paused'?tr('Tiếp tục','Continue','続ける'):tr('Xem nét','Play strokes','書き順を見る');}
 function ksStrokeSync(record,phase){
  document.querySelectorAll('[data-ks="stroke"]').forEach(b=>{const n=Number(b.dataset.index),selected=n===phase;b.classList.toggle('active',selected);b.classList.toggle('completed',n<phase);b.setAttribute('aria-pressed',String(selected));if(selected)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  document.querySelectorAll('.ks-stroke-pin').forEach(b=>{const n=Number(b.dataset.index);b.classList.toggle('is-active',n===phase);b.classList.toggle('is-complete',n<phase);});
 }
 function ksMountPins(record){const svg=document.querySelector('#ks-guide-svg svg');if(!svg)return;const ns='http://www.w3.org/2000/svg',placed=[];
  record.strokes.forEach((_,n)=>{const p=[...svg.querySelectorAll('.ks-path')].find(el=>Number(el.dataset.stroke)===n);if(!p)return;const at=p.getPointAtLength(0);let x=Math.max(34,Math.min(990,at.x-26)),y=Math.max(34,Math.min(990,at.y-30));for(const [dx,dy] of [[0,0],[64,-44],[-64,-44],[64,44],[-64,44],[0,70]]){const px=Math.max(34,Math.min(990,x+dx)),py=Math.max(34,Math.min(990,y+dy));if(placed.every(([a,b])=>Math.hypot(px-a,py-b)>62)){x=px;y=py;break;}}placed.push([x,y]);
   const g=document.createElementNS(ns,'g');g.setAttribute('class','ks-stroke-pin');g.setAttribute('data-index',String(n));g.setAttribute('transform','translate('+x+' '+y+')');
   const c=document.createElementNS(ns,'circle');c.setAttribute('r','28');const t=document.createElementNS(ns,'text');t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','central');t.textContent=String(n+1);g.append(c,t);svg.append(g);
  });
 }
 const audioKey=id=>'nihongo-kana-studio-audio-v1:'+id;
 const audioEnabled=id=>{try{return localStorage.getItem(audioKey(id))!=='off';}catch{return true;}};
 function saveAudioEnabled(id,enabled){try{localStorage.setItem(audioKey(id),enabled?'on':'off');}catch{/* Audio remains usable without storage. */}}
 let spokenByStudio=false,audioOwner=null,audioToken=0,audioTimer=0,currentUtterance=null;
 /* Spoken Kana from Wikimedia Commons, public-domain recordings by Hakatanoshio117117;
    'ka' recording by Doughaque. Same sound is used for both writing systems.
    Offline bundling is a future step; during LAN preview, recordings require internet. */
 const kanaClips={
  a:['ed','Ja-A.oga'],i:['ac','Japanese_I.ogg'],u:['c9','Japanese_U.ogg'],e:['86','Ja-E.oga'],o:['3b','Japanese_O.ogg'],
  ka:['63','Ja-ka.ogg'],ki:['65','Japanese_ki.ogg'],ku:['72','Japanese_ku.ogg'],ke:['2f','Japanese_ke.ogg'],ko:['48','Japanese_ko.ogg'],
  sa:['46','Japanese_sa.ogg'],shi:['89','Japanese_shi.ogg'],su:['35','Japanese_su.ogg'],se:['4d','Japanese_se.ogg'],so:['73','Ja-So.oga'],
  ta:['41','Japanese_ta.ogg'],chi:['ec','Japanese_ti.ogg'],tsu:['59','Japanese_tsu.ogg'],te:['b4','Japanese_te.ogg'],to:['5b','Japanese_to.ogg'],
  na:['11','Japanese_na.ogg'],ni:['db','Japanese_ni.ogg'],nu:['6c','Japanese_nu.ogg'],ne:['93','Japanese_ne.ogg'],no:['9b','Japanese_no.ogg'],
  ha:['55','Japanese_ha.ogg'],hi:['22','Japanese_hi.ogg'],fu:['c3','Japanese_hu.ogg'],he:['64','Japanese_he.ogg'],ho:['75','Japanese_ho.ogg'],
  ma:['5c','Japanese_ma.ogg'],mi:['58','Japanese_mi.ogg'],mu:['e6','Japanese_mu.ogg'],me:['36','Japanese_me.ogg'],mo:['41','Japanese_mo.ogg'],
  ya:['f9','Japanese_ya.ogg'],yu:['d0','Japanese_yu.ogg'],yo:['9c','Japanese_yo.ogg'],
  ra:['34','Japanese_ra.ogg'],ri:['36','Japanese_ri.ogg'],ru:['33','Japanese_ru.ogg'],re:['e3','Japanese_re.ogg'],ro:['bd','Japanese_ro.ogg'],
  wa:['3c','Japanese_wa.ogg'],wo:['41','Japanese_wo.ogg'],n:['fd','Japanese_N.ogg']
 };
 const commonsUrl=(key,format='mp3')=>{const spec=kanaClips[key];if(!spec)return null;const [hash,file]=spec,base='https://upload.wikimedia.org/wikipedia/commons/';return format==='mp3'?base+'transcoded/'+hash[0]+'/'+hash+'/'+encodeURIComponent(file)+'/'+encodeURIComponent(file)+'.mp3':base+hash[0]+'/'+hash+'/'+encodeURIComponent(file);};
 let kanaMedia=null,kanaLocalPackReady=false;
 // Use same-origin recordings once all 46 licensed MP3 assets are available.
 // Do not activate partially downloaded packs.
 if(typeof fetch==='function'){
   fetch('assets/kana-audio/pack.json',{cache:'no-store'})
     .then(r=>r.ok?r.json():null)
     .then(info=>{kanaLocalPackReady=!!(info&&info.schemaVersion===1&&info.sounds===46&&info.audioFormat==='mp3');})
     .catch(()=>{kanaLocalPackReady=false;});
 }
 function playKana(record){
   if(!record)return false;
   if(!kanaLocalPackReady){
     // Do not send more requests to Wikimedia after its robot-policy rejection.
     // Before installing all 46 MP3, try the OS voice as a temporary fallback.
     const attempted=sayKana(record);
     audioStatus(tr('Chưa cài đủ bộ ghi âm Kana. Đang thử giọng hệ thống; tải đủ 46 MP3 để phát ổn định trên iPhone.','Local Kana recordings not installed. Trying device speech; install all 46 MP3 files for reliable iPhone audio.','録音ファイルは未導入です。端末の読み上げを試しています。'));
     return attempted;
   }
   if(typeof Audio!=='function')return sayKana(record);
   const url='assets/kana-audio/'+record.romaji+'.mp3';
   stopAudio();
   const token=++audioToken;
   try{
     const audio=new Audio();
     kanaMedia=audio;
     audio.preload='none';audio.volume=1;
     audio.setAttribute('aria-hidden','true');
     const setError=()=>{
       if(token!==audioToken)return;
       audioStatus(tr('Không phát được ghi âm (lỗi media '+(audio.error?.code||'network')+'). Hãy kiểm tra kết nối hoặc file MP3, rồi nhấn lại.','Recording failed (media '+(audio.error?.code||'network')+'). Check the connection or MP3 file and retry.','録音を再生できません。通信または音声ファイルを確認してください。'));
     };
     audio.onerror=setError;
     audio.onplaying=()=>{if(token===audioToken)audioStatus('');};
     audio.onended=()=>{if(token===audioToken){kanaMedia=null;}};
     audio.src=url;
     audioStatus(tr('Đang tải ghi âm Kana…','Loading Kana recording…','音声を読み込み中…'));
     const attempt=audio.play(); // Triggered synchronously from a genuine click/tap on iPhone.
     if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>setError());
     return true;
   }catch{
     kanaMedia=null;
     audioStatus(tr('Không thể bắt đầu phát audio. Hãy thử chạm lại nút loa.','Could not start playback. Tap Listen again.','再生できません。もう一度押してください。'));
     return false;
   }
 }

 const isAppleTouch=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 function stopAudio(){
   audioToken++;clearTimeout(audioTimer);
   if(kanaMedia){const old=kanaMedia;kanaMedia=null;old.onerror=null;old.onplaying=null;old.onended=null;try{old.pause();old.removeAttribute('src');old.load();}catch{}}
   const synth=window.speechSynthesis;
   if(spokenByStudio&&synth&&(synth.speaking||synth.pending||synth.paused)){try{synth.cancel();}catch{}}
   spokenByStudio=false;audioOwner=null;currentUtterance=null;
 }
 function audioStatus(text){const el=document.querySelector('#ks-audio-status');if(el){el.textContent=text||'';el.hidden=!text;}}
 function sayKana(record){
   if(!record)return false;
   const synth=window.speechSynthesis;
   if(typeof window.SpeechSynthesisUtterance!=='function'||!synth){audioStatus(tr('Thiết bị này không hỗ trợ phát âm.','Speech synthesis is unavailable.','この端末では音声を利用できません。'));return false;}
   // This function must be called synchronously by a user click/touch on iOS.
   stopAudio();
   try{
     const voices=typeof synth.getVoices==='function'?Array.from(synth.getVoices()):[];
     const japanese=voices.find(v=>/^ja(?:-|$)/i.test(v.lang));
     // iOS can expose an incomplete voice list: try ja-JP with the system voice.
     if(voices.length&&!japanese&&!isAppleTouch()){
       audioStatus(tr('Chưa tìm thấy giọng tiếng Nhật trên thiết bị. Hãy cài Japanese voice.','No Japanese voice was found. Install a Japanese voice.','日本語の音声を追加してください。'));
       return false;
     }
     const utterance=new SpeechSynthesisUtterance(record.char);
     utterance.lang='ja-JP';utterance.rate=.88;utterance.pitch=1;utterance.volume=1;
     if(japanese)utterance.voice=japanese;
     const token=++audioToken;
     currentUtterance=utterance;spokenByStudio=true;audioOwner=P().id;
     let started=false;
     utterance.onstart=()=>{if(token!==audioToken)return;started=true;clearTimeout(audioTimer);audioStatus('');};
     utterance.onend=()=>{if(token!==audioToken)return;clearTimeout(audioTimer);spokenByStudio=false;audioOwner=null;currentUtterance=null;};
     utterance.onerror=event=>{
       if(token!==audioToken)return;
       clearTimeout(audioTimer);spokenByStudio=false;audioOwner=null;currentUtterance=null;
       if(!['canceled','interrupted'].includes(event.error)){
         audioStatus(tr('Không phát được âm tiếng Nhật. Trên iPhone, kiểm tra giọng Nhật trong Settings và thử nhấn Nghe âm lần nữa.','Japanese speech failed. Check Japanese voice settings and tap Listen again.','日本語音声を確認してからもう一度押してください。'));
       }
     };
     audioStatus('');
     synth.speak(utterance); // Stay in the immediate user-activation call stack.
     if(synth.paused)try{synth.resume();}catch{}
     audioTimer=setTimeout(()=>{
       if(token!==audioToken||started)return;
       audioStatus(tr('Chưa nghe thấy âm? Kiểm tra âm lượng, chế độ im lặng và giọng Nhật trên thiết bị; sau đó nhấn loa một lần nữa.','No sound yet? Check volume, silent mode and Japanese voice, then tap Listen again.','音量と日本語音声を確認して、もう一度押してください。'));
     },2800);
     return true;
   }catch{
     spokenByStudio=false;audioOwner=null;currentUtterance=null;clearTimeout(audioTimer);
     audioStatus(tr('Không thể phát âm trên trình duyệt này.','Speech playback is unavailable in this browser.','このブラウザーでは音声を再生できません。'));
     return false;
   }
 }
 const audioButton=(where,label)=>`<button type="button" class="ks-speak ks-speak-${where}" data-ks="speak" aria-label="${tr('Nghe phát âm chữ','Hear pronunciation of','文字の発音を聞く')} ${esc(label)}" title="${tr('Nghe phát âm','Hear pronunciation','発音を聞く')}">${speakerSvg}<span>${tr('Nghe âm','Listen','聞く')}</span></button>`;
 const autoButton=enabled=>`<button type="button" class="ks-auto-audio" data-ks="auto-audio" aria-pressed="${enabled}" title="${tr('Tự phát âm khi chọn chữ','Speak automatically on selection','文字を選ぶと発音')}">${speakerSvg}<span class="ks-auto-label">${tr('Tự đọc khi chọn','Auto pronunciation','自動読み上げ')}</span><span class="ks-auto-indicator">${enabled?tr('Bật','On','オン'):tr('Tắt','Off','オフ')}</span></button>`;
 let animation=0,playState=null,saveTimer=null;
 const current=()=>workspaces.get(P().id);
 const glyph=w=>records.get(w.snapshot.selected);
 const active=()=>route().split('/')[0]==='kana';
 function fresh(id){return {id,snapshot:{...M.defaults(),revision:0,draft:[],practices:{total:0,characters:[],latest:null}},drawing:[],dirty:false,strokeVersion:0,phase:0,mobileStep:'choose',loaded:false,loading:false,error:'',message:'',queue:Promise.resolve(),pending:0};}
 function ws(){let w=workspaces.get(P().id);if(!w){w=fresh(P().id);workspaces.set(w.id,w);}return w;}
 function storageKey(id){return 'nihongo-kana-studio-demo-v1:'+id;}
 function demoRead(id){try{return JSON.parse(localStorage.getItem(storageKey(id)))||{state:M.defaults(),revision:0,drawings:{},log:[],receipts:{}};}catch{throw new Error('Bản thử cục bộ chưa đọc được. Chưa ghi đè dữ liệu.');}}
 function demoSnapshot(raw){const chars={};for(const p of raw.log){chars[p.char]??={char:p.char,count:0,lastAt:p.at};chars[p.char].count++;chars[p.char].lastAt=p.at;}return {...raw.state,revision:raw.revision,draft:raw.drawings[raw.state.selected]||[],practices:{total:raw.log.length,characters:Object.values(chars),latest:raw.log.at(-1)||null}};}
 async function request(w,body){
   if(window.NPOnline){if(!NPOnline.ready)throw new Error('Đang mở tài khoản.');return NPOnline.request('learners/'+encodeURIComponent(w.id)+'/kana',body?'POST':'GET',body);}
   const raw=demoRead(w.id);if(!body)return demoSnapshot(raw);
   if(raw.receipts[body.eventId])return demoSnapshot(raw);
   if(body.revision!==raw.revision)throw Object.assign(new Error('Bản viết vừa thay đổi ở cửa sổ khác. Hãy tải lại.'),{status:409});
   const value=M.apply(raw.state,body);raw.state=value.state;if(value.strokes)raw.drawings[body.char]=value.strokes;
   if(body.action==='confirm')raw.log.push({char:body.char,at:new Date().toISOString(),strokeCount:value.strokes.length});
   raw.revision++;raw.receipts[body.eventId]=true;localStorage.setItem(storageKey(w.id),JSON.stringify(raw));return demoSnapshot(raw);
 }
 function message(w,text,error=false){w.message=text;w.error=error?text:'';if(!active()||P().id!==w.id)return;document.querySelectorAll('#ks-save-status,#ks-global-status').forEach(el=>{el.textContent=text;el.classList.toggle('is-error',error);});refreshControls(w);}
 async function load(w){if(w.loading)return;w.loading=true;try{const result=await request(w);w.snapshot=result;w.drawing=copy(result.draft);w.dirty=false;w.loaded=true;w.confirmedVersion=-1;w.error='';w.message=window.NPOnline?'Đã tải bản viết từ tài khoản.':'Bản thử cục bộ · Chưa đồng bộ server.';}catch(error){w.error=error.message;}finally{w.loading=false;if(active()&&P().id===w.id)render(false);}}
 function commit(w,payload){
   w.pending++;message(w,'Đang lưu…');
   const operation=w.queue.then(async()=>{
     const body={...payload,eventId:uid(),revision:w.snapshot.revision};let result;
     try{result=await request(w,body);}catch(error){if(error.status)throw error;result=await request(w,body);}
     w.snapshot=result;w.error='';return result;
   });
   w.queue=operation.catch(()=>{});
   return operation.catch(error=>{message(w,error.message,true);throw error;}).finally(()=>{w.pending--;if(!w.error)message(w,window.NPOnline?'Đã lưu bản viết trên tài khoản.':'Đã lưu trong bản thử cục bộ.');else refreshControls(w);});
 }
 async function saveDraft(w){clearTimeout(saveTimer);if(!w.loaded||!w.dirty)return true;const version=w.strokeVersion,char=w.snapshot.selected,strokes=M.drawing(w.drawing);try{await commit(w,{action:'draft',char,strokes});if(version===w.strokeVersion)w.dirty=false;return true;}catch{return false;}}
 function scheduleSave(w){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveDraft(w),650);}
 function revealWorkspace(){if(!matchMedia('(max-width:767px)').matches)return;const content=document.querySelector('.ks-columns'),steps=document.querySelector('.ks-steps'),bar=document.querySelector('.reviewbar');if(content){const target=(bar?.getBoundingClientRect().height||0)+(steps?.getBoundingClientRect().height||0)+12;window.scrollBy({top:content.getBoundingClientRect().top-target,left:0,behavior:'instant'});}}
 function stop(){if(animation)cancelAnimationFrame(animation);animation=0;playState=null;ksPlaybackStatus('stopped');}
 function svg(record,upto,small=false){
   const lines=record.strokes.map((paths,i)=>paths.map(d=>`<path d="${esc(d)}" class="ks-path" data-stroke="${i}" fill="none" stroke="${i<upto?'#318677':'#bc8234'}" stroke-width="${small?34:30}" stroke-linecap="round" stroke-linejoin="round" opacity="${i<=upto?1:0}"/>`).join('')).join('');
   const ghost=record.strokes.flat().map(d=>`<path d="${esc(d)}" fill="none" stroke="#cdd6df" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
   return `<svg viewBox="0 0 1024 1024" role="img" aria-label="${esc(record.char)} · ${tr('nét','stroke','画')} ${upto+1}" class="ks-svg ${small?'ks-svg-small':''}"><rect width="1024" height="1024" rx="28" fill="#fafcff"/><path d="M512 24V1000M24 512H1000" stroke="#c8d5df" stroke-width="4" stroke-dasharray="14 16"/>${ghost}${lines}${small?'':'<circle class="ks-pen" r="20" fill="#fff7dc" stroke="#258473" stroke-width="8"/><circle class="ks-pen-tip" r="6" fill="#258473"/>'}</svg>`;
 }
 function pathProgress(record,phase,progress){
   const root=document.querySelector('#ks-guide-svg svg');if(!root)return;root.setAttribute('aria-label',record.char+' · '+tr('nét','stroke','画')+' '+(phase+1));
   const paths=[...root.querySelectorAll('.ks-path')],selected=paths.filter(p=>Number(p.dataset.stroke)===phase),lengths=selected.map(p=>p.getTotalLength()),total=lengths.reduce((a,b)=>a+b,0);let offset=0,pen=null;
   for(const path of paths){const i=Number(path.dataset.stroke),len=path.getTotalLength();let amount=i<phase?1:0;
     if(i===phase){const traversed=Math.max(0,Math.min(len,progress*total-offset));amount=len?traversed/len:0;if(!pen&&progress*total<=offset+len)pen=path.getPointAtLength(traversed);offset+=len;}
     path.style.opacity=i<=phase?'1':'0';path.style.stroke=i<phase?'#318677':'#bc8234';path.style.strokeDasharray=len+' '+len;path.style.strokeDashoffset=String(len*(1-amount));
   }
   if(!pen&&selected.length)pen=selected.at(-1).getPointAtLength(lengths.at(-1));
   if(pen)root.querySelectorAll('.ks-pen,.ks-pen-tip').forEach(el=>{el.setAttribute('cx',pen.x);el.setAttribute('cy',pen.y);});
 }
 function drawGuide(w){const record=glyph(w);w.phase=Math.min(w.phase,record.strokes.length-1);const target=document.querySelector('#ks-guide-svg');if(!target)return;target.innerHTML=svg(record,w.phase);pathProgress(record,w.phase,0); // Start marker; current reference stroke remains visible.
   const root=target.querySelector('svg');root.querySelectorAll(`[data-stroke="${w.phase}"]`).forEach(p=>p.style.strokeDashoffset='0');
   ksMountPins(record);ksStrokeSync(record,w.phase);
 }
 function play(w,restart=false){
   if(playState&&!playState.paused&&!restart){cancelAnimationFrame(animation);animation=0;playState.paused=true;ksPlaybackStatus('paused');return;}
   const record=glyph(w),previous=playState?.paused&&!restart?playState:null;stop();
   const phase=restart?0:previous?.phase??w.phase,progress=previous?.progress||0;
   playState={phase,progress,paused:false,started:0};
   ksPlaybackStatus('playing');
   function frame(at){if(!playState||playState.paused||!active()||P().id!==w.id)return;
     const duration=1500/w.snapshot.speed;if(!playState.started)playState.started=at-playState.progress*duration;
     playState.progress=Math.min(1,Math.max(0,(at-playState.started)/duration));w.phase=playState.phase;
     pathProgress(record,w.phase,playState.progress);
     document.querySelector('#ks-stroke-label').textContent=`${tr('Nét','Stroke','画')} ${w.phase+1}/${record.strokes.length}`;
     ksStrokeSync(record,w.phase);
     if(playState.progress===1){if(w.phase===record.strokes.length-1){stop();return;}playState.phase++;playState.started=at+200;playState.progress=0;}
     animation=requestAnimationFrame(frame);
   }
   animation=requestAnimationFrame(frame);
 }
 function glyphButtons(w){return D.characters.filter(c=>c.script===w.snapshot.script).map(c=>{const done=w.snapshot.practices.characters.some(r=>r.char===c.char);return `<button type="button" class="ks-glyph ${c.char===w.snapshot.selected?'active':''}" data-ks="select" data-char="${c.char}" aria-label="${c.char} · ${c.romaji}" aria-pressed="${c.char===w.snapshot.selected}"><strong lang="ja">${c.char}</strong><small>${c.romaji}</small>${done?'<span class="ks-practised" aria-label="Đã tự luyện">✓</span>':''}</button>`;}).join('');}
 function page(){const w=ws();if(!w.loaded){return heading(tr('Phòng luyện viết Kana','Kana Writing Studio','かな書き方スタジオ'),'Chọn chữ → xem từng nét → tự viết lại.','FOUNDATION · KANA WRITING STUDIO')+`<section class="card"><p>${esc(w.error||'Đang tải bản viết của hồ sơ…')}</p>${w.error?'<button class="btn primary" data-ks="retry">Thử tải lại</button>':''}</section>`;}
   const c=glyph(w),stats=w.snapshot.practices;
   return `<section class="ks-studio ks-compact ks-mobile-${w.mobileStep}" data-learner="${esc(w.id)}"><header class="ks-hero"><div><span class="eyebrow">FOUNDATION · KANA WRITING STUDIO</span><h1>${tr('Phòng luyện viết Kana','Kana Writing Studio','かな書き方スタジオ')}</h1><p>Nghe âm · Xem thứ tự nét · Tự viết lại.</p></div>${link(tr('Quay lại Học','Back to Learn','学習に戻る'),'learn','btn','back')}</header><div class="ks-toolbar"><div class="ks-scripts" role="group" aria-label="Bảng chữ">${[['hiragana','あ Hiragana'],['katakana','ア Katakana']].map(([s,label])=>`<button class="btn ${s===w.snapshot.script?'primary':''}" data-ks="script" data-script="${s}" aria-pressed="${s===w.snapshot.script}">${label}</button>`).join('')}</div><div class="ks-toolbar-meta"><p>${stats.total} lượt tự luyện · ${stats.characters.length}/92 chữ${stats.latest?` · Gần nhất: <strong lang="ja">${stats.latest.char}</strong>`:''}</p>${autoButton(audioEnabled(w.id))}</div></div><p id="ks-audio-status" class="ks-audio-status" role="status" aria-live="polite"></p><p id="ks-global-status" class="ks-global-status ${w.error?'is-error':''}" role="status">${esc(w.error||w.message)}</p><div class="ks-global-recovery" ${w.error?'':'hidden'}><button class="btn" data-ks="reload">Tải tiến độ mới</button></div><nav class="ks-steps" aria-label="Ba bước luyện viết">${[['choose','Chọn chữ','Choose','選ぶ'],['watch','Xem từng nét','Watch','書き順'],['write','Tự viết lại','Write','書く']].map(([step,vi,en,ja],i)=>`<button data-ks="step" data-step="${step}" aria-current="${w.mobileStep===step?'step':'false'}"><span>${i+1}</span>${tr(vi,en,ja)}</button>`).join('')}</nav><div class="ks-columns"><section class="card ks-choose"><div class="ks-panel-title"><span class="eyebrow">BƯỚC 1</span><h2>${tr('Chọn chữ cần luyện','Choose a character','練習する文字')}</h2></div><div class="ks-glyph-grid">${glyphButtons(w)}</div><details class="ks-info"><summary>${tr('Hướng dẫn','Guide','ガイド')}</summary><p>46 Hiragana và 46 Katakana. Dấu ✓ chỉ ghi nhận đã tự luyện, không xác nhận đã viết đúng hoặc thuộc chữ.</p></details></section><section class="card ks-watch"><div class="ks-panel-title"><span class="eyebrow">BƯỚC 2</span><h2>${tr('Xem cách viết · từng nét','Watch each stroke','一画ずつ見る')}</h2></div><div class="ks-current"><strong lang="ja">${c.char}</strong><span>${c.romaji}</span>${audioButton('watch',c.char)}<small>${c.strokes.length} nét · Dữ liệu có sẵn</small></div><div class="ks-stroke-sequence"><span class="ks-seq-title">${tr('Thứ tự nét','Stroke order','書き順')}</span><div class="ks-seq-steps">${c.strokes.map((_,i)=>`<button type="button" data-ks="stroke" data-index="${i}" class="ks-seq-step ${i===w.phase?'active':''}" aria-label="${tr('Nét','Stroke','画')} ${i+1}" aria-pressed="${i===w.phase}">${i+1}</button>`).join('')}</div></div><div id="ks-guide-svg">${svg(c,w.phase)}</div><div class="ks-guide-label"><strong id="ks-stroke-label" aria-live="polite">Nét ${w.phase+1}/${c.strokes.length}</strong><span>Chấm xanh: điểm đặt bút</span></div><div class="ks-controls"><div class="ks-playback-bar"><button type="button" class="ks-play-primary" data-ks="play" data-playing="false">${ksIcon('play')}${ksIcon('pause')}<span class="ks-play-label">${tr('Xem nét','Play strokes','書き順を見る')}</span></button><button type="button" class="ks-control-icon" data-ks="prev" aria-label="${tr('Nét trước','Previous stroke','前の画')}" title="${tr('Nét trước','Previous stroke','前の画')}">${ksIcon('prev')}</button><button type="button" class="ks-control-icon" data-ks="next" aria-label="${tr('Nét sau','Next stroke','次の画')}" title="${tr('Nét sau','Next stroke','次の画')}">${ksIcon('next')}</button><button type="button" class="ks-control-icon" data-ks="replay" aria-label="${tr('Phát lại','Replay','もう一度')}" title="${tr('Phát lại','Replay','もう一度')}">${ksIcon('replay')}</button></div><div class="ks-playback-settings"><label class="ks-speed">Tốc độ<select data-ks-speed aria-label="Tốc độ xem nét">${[[.5,'Chậm'],[1,'Bình thường'],[1.5,'Nhanh']].map(([speed,label])=>`<option value="${speed}" ${speed===w.snapshot.speed?'selected':''}>${label}</option>`).join('')}</select></label></div></div><div class="ks-thumbnails">${c.strokes.map((_,i)=>`<button data-ks="stroke" data-index="${i}" class="${w.phase===i?'active':''}" aria-pressed="${w.phase===i}" aria-label="Xem nét ${i+1}"><span>Nét ${i+1}</span>${svg(c,i,true)}</button>`).join('')}</div><button class="btn ks-to-write" data-ks="step" data-step="write">${tr('Tôi muốn tự viết lại','Practise now','自分で書く')} ${icon('arrow')}</button><details class="ks-info ks-source"><summary>${tr('Hướng dẫn nét & nguồn','Stroke guide & credits','書き順と出典')}</summary><p>Dữ liệu nét: <a href="https://github.com/parsimonhi/animCJK" target="_blank" rel="noopener">AnimCJK</a> · <a href="assets/kana-strokes/NOTICE.txt" target="_blank">Nguồn & giấy phép</a>. Nét đang chọn màu vàng, nét trước màu xanh. <a href="assets/kana-audio/ATTRIBUTION.txt" target="_blank" rel="noopener noreferrer">${tr('Nguồn ghi âm','Audio source','録音の出典')}</a>.</p></details></section><section class="card ks-write"><div class="ks-panel-title ks-write-title"><div><span class="eyebrow">BƯỚC 3</span><h2>${tr('Tự viết lại','Write it yourself','自分で書く')} <span class="ks-writing-char" lang="ja">${c.char}</span></h2></div>${audioButton('write',c.char)}</div><p class="small">Dùng ngón tay, bút cảm ứng hoặc chuột.</p><div class="ks-canvas-wrap"><canvas id="ks-writing" aria-label="Bảng tự viết ${c.char}" role="img"></canvas></div><div class="ks-writing-tools"><button class="btn ks-write-tool" data-ks="undo">${ksIcon('undo')}<span>${tr('Lùi nét','Undo','戻す')}</span></button><button class="btn ks-write-tool" data-ks="clear">${ksIcon('clear')}<span>${tr('Xóa bảng','Clear','消去')}</span></button><button class="btn primary ks-write-tool" data-ks="confirm">${ksIcon('check')}<span>${tr('Đã tự luyện chữ này','Mark practice','練習済みにする')}</span></button></div><p id="ks-save-status" class="ks-save-status ${w.error?'is-error':''}" role="status">${esc(w.error||w.message||'Bản viết được giữ riêng cho hồ sơ này.')}</p><div class="ks-save-recovery" ${w.error?'':'hidden'}><button class="btn" data-ks="save">Thử lưu lại</button><button class="btn" data-ks="reload">Tải tiến độ mới</button></div><details class="ks-info ks-evidence"><summary>${tr('Thông tin đánh giá','Progress information','進捗について')}</summary><p>Tự luyện · Chưa chấm nét hoặc độ chính xác. Xác nhận chỉ ghi một lượt tự luyện; không tăng điểm thành thạo.</p></details><div class="ks-draft-actions"><button class="textlink" data-ks="export">Tải bản viết để giữ lại</button><button class="textlink" data-ks="step" data-step="watch">Xem lại nét mẫu</button></div><p class="small">${window.NPOnline?'Bản viết được lưu lên tài khoản khi có mạng.':'Đang ở bản thử cục bộ; kết quả không đi vào database học thật.'}</p></section></div></section>`;
 }
 function paint(w,canvas){const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);ctx.fillStyle='#fafcff';ctx.fillRect(0,0,size,size);ctx.strokeStyle='#cad6e0';ctx.lineWidth=size/500;ctx.setLineDash([size/40,size/40]);ctx.beginPath();ctx.moveTo(size/2,0);ctx.lineTo(size/2,size);ctx.moveTo(0,size/2);ctx.lineTo(size,size/2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#294b60';ctx.lineWidth=size*.012;ctx.lineJoin='round';ctx.lineCap='round';for(const stroke of [...w.drawing,...(w.currentStroke?[w.currentStroke]:[])]){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(stroke[0][0]*size,stroke[0][1]*size);for(const p of stroke.slice(1))ctx.lineTo(p[0]*size,p[1]*size);ctx.stroke();}}
 function refreshControls(w){if(!active()||P().id!==w.id)return;const busy=w.pending>0;for(const action of ['undo','clear']){const b=document.querySelector(`[data-ks="${action}"]`);if(b)b.disabled=!w.drawing.length||busy;}const confirm=document.querySelector('[data-ks="confirm"]');if(confirm)confirm.disabled=busy||!M.hasWriting(w.drawing)||w.confirmedVersion===w.strokeVersion;document.querySelectorAll('[data-ks="select"],[data-ks="script"],[data-ks="step"]').forEach(b=>b.disabled=!!w.switching);document.querySelectorAll('.ks-save-recovery,.ks-global-recovery').forEach(el=>el.hidden=!w.error);}
 function mount(){if(!active()){stop();return;}if(window.NPOnline&&!NPOnline.ready)return;const w=ws();if(!w.loaded){if(!w.loading&&!w.error)load(w);return;}const root=document.querySelector('.ks-studio');if(!root)return;drawGuide(w);const canvas=document.querySelector('#ks-writing');if(!canvas||canvas.dataset.mounted)return;canvas.dataset.mounted='true';canvas.width=800;canvas.height=800;paint(w,canvas);let pointer=null;
   const point=event=>{const rect=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];};
   canvas.addEventListener('pointerdown',event=>{if(pointer!==null||event.button!==0||w.switching)return;event.preventDefault();pointer=event.pointerId;canvas.setPointerCapture(pointer);w.currentStroke=[point(event)];paint(w,canvas);});
   canvas.addEventListener('pointermove',event=>{if(pointer!==event.pointerId||!w.currentStroke)return;event.preventDefault();const p=point(event),last=w.currentStroke.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])>.002){w.currentStroke.push(p);if(w.currentStroke.length>256)w.currentStroke=w.currentStroke.filter((_,i)=>i%2===0);}paint(w,canvas);});
   function finish(event){if(pointer!==event.pointerId)return;const cancelled=event.type==='pointercancel';pointer=null;if(!cancelled&&w.currentStroke?.length){if(w.drawing.length>=32){message(w,'Bảng hiện tối đa 32 nét. Lùi nét hoặc xóa bảng để viết lại.',true);}else{w.drawing.push(w.currentStroke);w.strokeVersion++;w.dirty=true;scheduleSave(w);}}w.currentStroke=null;paint(w,canvas);refreshControls(w);}
   canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);refreshControls(w);
 }
 async function choose(w,char){if(!records.has(char)||w.switching)return;w.switching=true;refreshControls(w);try{if(!await saveDraft(w))return;stop();const result=await commit(w,{action:'select',char});w.drawing=copy(result.draft);w.strokeVersion++;w.confirmedVersion=-1;w.phase=0;w.mobileStep='watch';if(active()&&P().id===w.id){render(false);revealWorkspace();}}catch{}finally{w.switching=false;refreshControls(w);}}
 document.addEventListener('click',async event=>{
   const b=event.target.closest('[data-ks]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();const w=ws(),action=b.dataset.ks;
   try{
    if(action==='retry'){w.error='';load(w);return;}if(!w.loaded)return;
    if(action==='speak'){playKana(glyph(w));return;}
    if(action==='auto-audio'){const enabled=!audioEnabled(w.id);saveAudioEnabled(w.id,enabled);if(!enabled)stopAudio();b.setAttribute('aria-pressed',String(enabled));b.querySelector('.ks-auto-indicator').textContent=enabled?tr('Bật','On','オン'):tr('Tắt','Off','オフ');audioStatus('');return;}
    if(action==='select'){if(audioEnabled(w.id)&&records.has(b.dataset.char)&&!w.switching)playKana(records.get(b.dataset.char));await choose(w,b.dataset.char);return;}
    if(action==='script'){const saved=D.characters.find(c=>c.script===b.dataset.script);if(!saved)return;if(audioEnabled(w.id)&&!w.switching)playKana(saved);await choose(w,saved.char);w.mobileStep='choose';if(active())render(false);return;}
    if(action==='step'){stop();if(!await saveDraft(w))return;w.mobileStep=b.dataset.step;render(false);revealWorkspace();return;}
    if(action==='play'){play(w);return;}if(action==='replay'){play(w,true);return;}
    if(['prev','next','stroke'].includes(action)){stop();const n=glyph(w).strokes.length;w.phase=action==='stroke'?Number(b.dataset.index):Math.max(0,Math.min(n-1,w.phase+(action==='next'?1:-1)));drawGuide(w);return;}
    if(action==='undo'||action==='clear'){stop();if(action==='undo')w.drawing.pop();else w.drawing=[];w.strokeVersion++;w.dirty=true;paint(w,document.querySelector('#ks-writing'));refreshControls(w);await saveDraft(w);return;}
    if(action==='save'){await saveDraft(w);return;}
    if(action==='reload'){if(w.dirty){modal('Giữ bản viết trước khi tải lại','<p>Thiết bị khác có thể đã lưu bản mới. Tải tiến độ mới sẽ thay bản nháp đang giữ trên màn hình này.</p><div class="actions"><button class="btn" data-ks="export">Tải bản viết để giữ lại</button><button class="btn primary" data-ks="reload-confirm">Tải lại và thay bản nháp</button></div>');}else await load(w);return;}
    if(action==='reload-confirm'){await w.queue;closeModal();await load(w);return;}
    if(action==='confirm'){stop();clearTimeout(saveTimer);const version=w.strokeVersion;await commit(w,{action:'confirm',char:w.snapshot.selected,strokes:M.drawing(w.drawing)});if(version===w.strokeVersion){w.dirty=false;w.confirmedVersion=version;}message(w,'Đã ghi nhận một lượt tự luyện. Chưa đánh giá đúng/sai.');document.querySelectorAll('.ks-glyph').forEach(el=>{if(w.snapshot.practices.characters.some(r=>r.char===el.dataset.char)&&!el.querySelector('.ks-practised'))el.insertAdjacentHTML('beforeend','<span class="ks-practised" aria-label="Đã tự luyện">✓</span>');});const p=document.querySelector('.ks-toolbar>p');if(p)p.textContent=`${w.snapshot.practices.total} lượt tự luyện · ${w.snapshot.practices.characters.length}/92 chữ · Gần nhất: ${w.snapshot.selected}`;return;}
    if(action==='export'){const blob=new Blob([JSON.stringify({schemaVersion:1,learnerId:w.id,char:w.snapshot.selected,strokes:w.drawing,evidence:'ungraded-writing-draft'},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Kana_'+w.snapshot.selected+'_draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
   }catch(error){message(w,error.message,true);}
 },true);
 document.addEventListener('change',async event=>{if(!event.target.matches('[data-ks-speed]'))return;stop();const w=ws();try{await commit(w,{action:'speed',speed:Number(event.target.value)});}catch(error){message(w,error.message,true);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
 window.addEventListener('beforeunload',event=>{if([...workspaces.values()].some(w=>w.dirty||w.pending)){event.preventDefault();event.returnValue='';}});
 window.NPKanaStudio={page,mount,flush:()=>{const w=current();return w?saveDraft(w):Promise.resolve(true);},hasUnsaved:()=>[...workspaces.values()].some(w=>w.dirty||w.pending),summary:id=>workspaces.get(id)?.snapshot.practices};
 const previous=kanaPage;kanaPage=()=>page();const sectionBefore=activeSection;activeSection=r=>r.split('/')[0]==='kana'?'learn':sectionBefore(r);const titleBefore=titleOf;titleOf=r=>r.split('/')[0]==='kana'?tr('Phòng luyện viết Kana','Kana Writing Studio','かな書き方スタジオ'):titleBefore(r);const renderBefore=render;render=function(scroll){if(!active()){stop();stopAudio();}else if(audioOwner&&audioOwner!==P().id)stopAudio();renderBefore(scroll);mount();};
})();
