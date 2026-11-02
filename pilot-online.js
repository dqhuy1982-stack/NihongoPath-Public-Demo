/* Live pilot adapter. The demo remains available with ?mode=demo. */
(function(){
 'use strict';
 if(new URLSearchParams(location.search).get('mode')==='demo'||location.pathname!=='/')return;
 const E=NPLessonEngine,baseCatalog=NPContentCatalog,localRead=NPLessonStore.read;
 const live={ready:false,busy:false,error:'',states:{},profiles:[],catalog:[],profileQueue:Promise.resolve(),pending:0};
 window.NPOnline=live;
 let current=sessionStorage.getItem('np-selected-learner')||'demo-a',profileSignatures={},lastCommand=null,startedAt=performance.now(),originalRender;
 const encode=encodeURIComponent;
 function notify(message){if(typeof toast==='function')toast(message);}
 async function api(path,method='GET',body){
   const r=await fetch('/api/pilot/'+path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
   const value=await r.json();if(!r.ok){const error=Object.assign(new Error(value.error||'Chưa kết nối được.'),{status:r.status,state:value.state});throw error;}return value;
 }
 live.request=api;
 function overlay(title,body,actions){
   let el=document.querySelector('#online-overlay');if(!el){el=document.createElement('div');el.id='online-overlay';document.body.append(el);}
   el.innerHTML=`<section class="card online-welcome"><img src="assets/n-mark.svg" width="48" height="48" alt="Nihongo Path"><span class="eyebrow">NỀN TẢNG & N5 · HỌC THỬ</span><h1>${esc(title)}</h1><p>${esc(body)}</p><div class="actions">${actions||''}</div><p class="small"><a href="?mode=demo">Mở prototype cũ · dữ liệu trên trình duyệt</a></p></section>`;
 }
 function hideOverlay(){document.querySelector('#online-overlay')?.remove();}
 function status(message,failed=false){live.error=failed?message:'';const el=document.querySelector('#online-status');if(el){el.textContent=message;el.classList.toggle('error',failed);}}
 function snapshotProfile(p){const clean=structuredClone(p);delete clean.serverRevision;return JSON.stringify(clean);}
 function hydrate(data){
   live.profiles=structuredClone(data.profiles);live.states=data.states;live.catalog=data.catalog;
   if(!data.profiles.some(p=>p.id===current&&!p.archived))current=data.profiles.find(p=>!p.archived)?.id;
   db={schemaVersion:1,current,profiles:structuredClone(data.profiles)};
   profileSignatures=Object.fromEntries(db.profiles.map(p=>[p.id,snapshotProfile(p)]));
   live.ready=true;live.error='';hideOverlay();render(false);
 }
 async function load(){
   try{
     const data=await api('bootstrap');
     if(!data.profiles.length){
       overlay('Một không gian học thật, bắt đầu từ đây.','Khởi tạo hồ sơ gia đình với tiến độ trống. Kết quả học được lưu cho tài khoản ChatGPT đang đăng nhập; dữ liệu demo cũ được giữ riêng.',`<button class="btn primary" id="online-setup">Khởi tạo không gian học</button>`);
       document.querySelector('#online-setup').onclick=async e=>{e.target.disabled=true;try{await api('setup','POST',{profiles:initialProfiles.map(p=>({...structuredClone(p),notes:[],goal:p.id==='demo-a'?'N5':p.goal}))});await load();}catch(err){status(err.message,true);overlay('Chưa khởi tạo được',err.message,'<button class="btn primary" onclick="location.reload()">Thử lại</button>');}};
       return;
     }
     hydrate(data);
   }catch(error){live.ready=false;overlay('Chưa mở được không gian học',error.message,error.status===401?'<a class="btn primary" href="/signin-with-chatgpt?return_to=/" target="_top">Đăng nhập ChatGPT</a>':'<button class="btn primary" onclick="location.reload()">Thử kết nối lại</button>');}
 }
 NPLessonStore.read=function(storage,id){if(!live.ready)return null;return live.states[id]||E.create(id);};
 NPLessonStore.write=function(){throw new Error('Thay đổi học tập cần được máy chủ xác nhận.');};
 baseCatalog.get=function(id=baseCatalog.base.id,version){return live.catalog.find(c=>c.id===id&&(!version||c.version===Number(version)))||null;};
 baseCatalog.list=()=>live.catalog;
 baseCatalog.reviewContent=function(state,options={}){const list=(options.includeEarly?state.reviews:E.due(state));for(const r of list){const c=baseCatalog.get(r.contentId,r.contentVersion);if(c)return c;}return null;};
 const oldPersist=persist;
 persist=function(message){
   if(!live.ready)return false;
   const changed=db.profiles.filter(p=>profileSignatures[p.id]!==snapshotProfile(p)).map(p=>structuredClone(p));
   if(!changed.length)return true;
   live.pending+=changed.length;status('Đang lưu thay đổi…');
   for(const p of changed){
     const signature=snapshotProfile(p);profileSignatures[p.id]=signature;
     live.profileQueue=live.profileQueue.then(async()=>{
       const stored=live.profiles.find(x=>x.id===p.id);
       const result=stored?await api('learners/'+encode(p.id),'PUT',{revision:stored.serverRevision,profile:p}):await api('learners','POST',{profile:p});
       const index=live.profiles.findIndex(x=>x.id===p.id);if(index>=0)live.profiles[index]=result.profile;else live.profiles.push(result.profile);
       const display=db.profiles.find(x=>x.id===p.id);if(display)display.serverRevision=result.profile.serverRevision;
       if(result.state)live.states[p.id]=result.state;
       live.pending--;if(!live.pending){live.unsaved=false;status('Đã lưu trên tài khoản');if(message)notify('Đã lưu thay đổi trên tài khoản.');}
     }).catch(error=>{live.pending=Math.max(0,live.pending-1);live.unsaved=true;live.error=error.message;status(error.message,true);profileSignatures[p.id]='';notify(error.message+' Giữ tab này và chọn Thử lưu lại.');});
   }
   return true;
 };
 function showProfile(id){
   const p=db.profiles.find(p=>p.id===id&&!p.archived);if(!p)return;
   modal('Không gian của '+p.name,`<div class="online-avatar">${avatar(p,true)}</div><p>Hồ sơ thuộc không gian gia đình của tài khoản ChatGPT đang đăng nhập. Không cần nhập mã demo.</p><button class="btn primary wide" id="online-enter">Vào học ${icon('arrow')}</button><p class="small">Đợt thử đầu: hồ sơ do chủ tài khoản quản lý. Chưa có tài khoản riêng cho từng thành viên.</p>`);
   document.querySelector('#online-enter').onclick=async()=>{if(live.busy)await live.commandWait;if(!await flushPersonal())return;if(window.NPKanaStudio&&!await NPKanaStudio.flush())return;await live.profileQueue;if(live.unsaved){notify('Lưu thay đổi hoặc xuất bản nháp trước khi đổi hồ sơ.');return;}current=id;sessionStorage.setItem('np-selected-learner',id);db.current=id;resetLearningView();closeModal();go(p.onboarded?'today':'onboarding');};
 }
 function cards(){return live.catalog.map(c=>`<a class="card online-course" href="#lesson/${c.id}"><span class="eyebrow">${esc(c.level)} · GÓI HỌC THỬ</span><h2>${esc(c.title)}</h2><p>${esc(c.lead||c.scope)}</p><span class="textlink">Mở bài học ${icon('arrow')}</span></a>`).join('');}
 function pilotHome(){const state=live.states[P().id]||E.create(P().id),pending=E.pending(state)[0],due=E.due(state);return `${heading('Hôm nay, một bước vừa sức.','Bắt đầu với Nền tảng hoặc N5. Kết quả được lưu riêng theo hồ sơ.','KHÔNG GIAN CỦA '+esc(P().name))}<section class="mentor-card section"><span class="eyebrow">MICHI · GỢI Ý CÓ LÝ DO</span><h2>${pending?'Bạn còn một phiên đang dở.':due.length?'Một vài mẫu đã đến hạn ôn.':'Chọn một bài nhỏ để bắt đầu.'}</h2><p>${pending?'Tiếp tục đúng phiên bản, câu trả lời và gợi ý đã lưu.':due.length?'Thử nhớ lại trước khi mở lời giải.':'Chưa dùng mục tiêu để kết luận trình độ. Bạn có thể thử Kana hoặc bài nhập môn N5.'}</p><div class="actions">${pending?button('Học tiếp '+icon('arrow'),'online-resume','btn primary',`data-id="${esc(pending.id)}"`):due.length?link('Ôn một lượt','lesson/review','btn primary'):link('Làm quen năm chữ Kana','lesson/foundation-vowels','btn primary')}${link('Xem tiến độ','reports','btn')}</div></section><div class="grid two section">${cards()}</div><p class="article-note">${esc(P().goal)} là mục tiêu hồ sơ. Gói phát hành hiện tại chỉ gồm Nền tảng và N5; không ghi nhận N4–N1 là đã có nội dung đầy đủ.</p>`;}
 const allowed=new Set(['login','profiles','today','learn','course','lesson','quiz','summary','review','mistakes','reports','notebook','settings','profile','family','guide','onboarding','ready','logout','journey','kana']);
 function redraw(scroll){
   if(!live.ready)return;
   const base=route().split('/')[0];
   document.body.classList.remove('is-admin');
   if(base==='today'){$('#app').innerHTML=shell(pilotHome());document.body.classList.remove('is-login');applyPrefs();Locale.translate(document);}
   else if(base==='guide'){$('#app').innerHTML=shell(heading('Bắt đầu một vòng học nhỏ.','Nền tảng và N5 là hai gói đầu tiên. Bạn có thể dừng rồi mở lại đúng hồ sơ để học tiếp.','HƯỚNG DẪN')+'<section class="card"><h2>Học thử theo nhịp của bạn</h2><ol><li>Chọn hồ sơ gia đình.</li><li>Mở Nền tảng hoặc N5 trong mục Học.</li><li>Chọn phiên ngắn, thử trả lời và xem giải thích.</li><li>Chờ xác nhận đã lưu trước khi đóng tab.</li><li>Xem tổng kết và lịch ôn trong mục Ôn hoặc Báo cáo.</li></ol><p>Mở cùng Site bằng cùng tài khoản ChatGPT trên thiết bị khác để tải lại tiến độ. Hồ sơ hiện do chủ tài khoản quản lý; chưa có đăng nhập riêng cho từng thành viên.</p><p>Chưa có audio, chấm nói/viết, thông báo nhắc học hoặc học offline hoàn chỉnh trong gói này.</p></section><div class="actions section">'+link('Mở bài học','learn','btn primary')+link('Về Hôm nay','today','btn')+'</div>');document.body.classList.remove('is-login');applyPrefs();}
   else if(['learn','library'].includes(base)||base==='course'&&['foundation','N5'].includes(route().split('/')[1])){$('#app').innerHTML=shell(heading('Nền tảng & N5','Hai gói đầu tiên để học thử. Các chặng N4–N1 tiếp tục giữ trong lộ trình.','HỌC')+`<div class="grid two">${cards()}</div>`+foundationStudioCard()+link('Xem toàn bộ hành trình','journey','textlink','map'));document.body.classList.remove('is-login');applyPrefs();}
   else if(!allowed.has(base)||base==='settings'&&['account','data','reminders'].includes(route().split('/')[1])){$('#app').innerHTML=shell(heading('Phần này chưa mở trong đợt học thử.','Tiến độ thật hiện áp dụng cho hai bài Nền tảng/N5, ôn, sổ và báo cáo.','ĐANG PHÁT TRIỂN')+link('Về Hôm nay','today','btn primary')+'<p class="article-note"><a href="?mode=demo" target="_blank" rel="noopener">Xem chức năng trong prototype cũ ↗</a></p>');document.body.classList.remove('is-login');applyPrefs();}
   else originalRender(scroll);
   document.title='Nihongo Path · '+(base==='login'?'Không gian gia đình':'Nền tảng & N5');
   document.querySelector('.review-label')?.replaceChildren(document.createTextNode('Nền tảng & N5 · Học thử'));
   const rb=document.querySelector('.review-actions');if(rb&&!document.querySelector('#online-status'))rb.insertAdjacentHTML('afterbegin','<span id="online-status" role="status">Đã kết nối tài khoản</span>');
   if(live.error){status(live.error,true);const statusEl=document.querySelector('#online-status');if(statusEl&&!document.querySelector('#online-retry'))statusEl.insertAdjacentHTML('afterend','<button class="btn sm" id="online-retry">Thử lưu lại</button>');document.querySelector('#online-retry')?.addEventListener('click',()=>{live.error='';live.unsaved=false;persist();render(false);});}else if(live.pending)status('Đang lưu thay đổi…');
   document.querySelectorAll('.n5-save').forEach(el=>{el.childNodes.forEach(n=>{if(n.nodeType===3&&n.textContent.includes('Đã lưu trên trình duyệt này'))n.textContent=live.busy?'Đang lưu…':'Đã lưu trên tài khoản';});});
   document.querySelectorAll('a[href="#story/meet"]').forEach(a=>a.href='#lesson/n5-introduction');
   document.querySelectorAll('.n5-entry .n5-time-options button[data-minutes="15"]').forEach(el=>{if(el.dataset.content==='foundation-vowels')el.hidden=true;});
   if(base==='login'){
     document.querySelectorAll('a[href="#invite"],a[href="#guest"]').forEach(a=>{a.href='?mode=demo';a.textContent='Khám phá prototype cũ';});
     document.querySelectorAll('[data-action="loginprofile"]').forEach(el=>el.setAttribute('aria-label','Mở hồ sơ '+(db.profiles.find(p=>p.id===el.dataset.id)?.name||'')));
     document.querySelector('.atelier-demo-note')?.replaceChildren(document.createTextNode('Nền tảng & N5 · Có lưu tiến độ'));
     document.querySelectorAll('.login-note,.login-fineprint').forEach(el=>{el.textContent='Chọn hồ sơ trong không gian gia đình đang đăng nhập.';});
   }
   const replacements=[['Chạm vào ảnh. Bước vào nhịp học của bạn.','Chạm vào ảnh để mở hồ sơ học của bạn.'],['Chọn ảnh để nhập mã truy cập.','Chọn ảnh để vào không gian học.'],['Bản trải nghiệm · dùng mã mẫu','Nền tảng & N5 · Có lưu tiến độ'],['Dữ liệu thử lưu trên thiết bị · Chưa có xác thực thật','Tiến độ lưu theo tài khoản · Hồ sơ gia đình được quản lý'],['Tiến độ lưu theo hồ sơ trên trình duyệt. Đồng bộ giữa các thiết bị sẽ cần backend.','Tiến độ được lưu theo hồ sơ trên tài khoản.'],['Đồng bộ giữa các thiết bị sẽ cần backend.','Mở cùng tài khoản để tải lại tiến độ.']];
   const walker=document.createTreeWalker(document.querySelector('#app'),NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){for(const [from,to] of replacements)if(node.textContent.includes(from))node.textContent=node.textContent.replace(from,to);}
   document.querySelectorAll('.note-body').forEach(el=>el.setAttribute('data-no-translate',''));
   if(base==='family'){const n=document.querySelector('.notice');if(n)n.innerHTML='<div>Hồ sơ do tài khoản ChatGPT hiện tại quản lý. Thêm, lưu trữ và khôi phục được lưu trên tài khoản. Chưa có lời mời hoặc tài khoản riêng cho từng thành viên.</div>';}
   if(base==='lesson'&&(route().includes('foundation-vowels')||E.active(live.states[P().id])?.contentId==='foundation-vowels')){const visual=document.querySelector('.n5-entry-visual');if(visual)visual.innerHTML='<span class="n5-disc"></span><span lang="ja">あ い う<br>え お</span><small>NHẬN MẶT · THỬ NHỚ · ÔN LẠI</small>';}
   if(live.busy)document.querySelectorAll('[data-action^="n5-"]').forEach(el=>el.disabled=true);
   window.NPLessonInteractions?.mount();
   window.NPKanaStudio?.mount();
 }
 async function command(input){
   if(live.busy)await live.commandWait;const id=P().id,state=live.states[id];if(!state)return null;
   let release;live.commandWait=new Promise(resolve=>release=resolve);
   live.busy=true;status('Đang lưu bước học…');
   const body={...input,revision:state.revision,eventId:crypto.randomUUID(),elapsedMs:Math.max(0,Math.min(600000,performance.now()-startedAt))};lastCommand={id,body};
   try{
     let result;
     try{result=await api('learners/'+encode(id)+'/state','POST',body);}catch(error){if(error.status)throw error;result=await api('learners/'+encode(id)+'/state','POST',body);}
     live.states[id]=result.state;lastCommand=null;live.error='';startedAt=performance.now();status('Đã lưu trên tài khoản');return result;
   }catch(error){
     if(error.status===409){const result=await api('learners/'+encode(id)+'/state');live.states[id]=result.state;lastCommand=null;}
     live.error=error.message;notify(error.message+' Bước chưa được xác nhận sẽ không tính là hoàn tất.');return null;
   }finally{live.busy=false;release();}
 }
 // Registered before lesson-ui so the old browser-only handler cannot write live results.
 document.addEventListener('click',async event=>{
   if(event.target.closest('#online-overlay'))return;
   const el=event.target.closest('button,a');if(!el)return;const action=el.dataset.action||'',hash=el.getAttribute('href')||'';
   if(action==='portal-guest'){event.preventDefault();event.stopImmediatePropagation();location.href='?mode=demo';return;}
   const blocked=['resetprofile','confirmresetprofile','resetdemo','confirmresetdemo','fillcode','fillinvite','invite'];
   if(!live.ready){event.preventDefault();event.stopImmediatePropagation();return;}
   if(action==='loginprofile'||action==='selectprofile'){event.preventDefault();event.stopImmediatePropagation();showProfile(el.dataset.id);return;}
   if(blocked.includes(action)){event.preventDefault();event.stopImmediatePropagation();notify('Chức năng này chỉ dùng trong prototype cũ; không đặt lại dữ liệu học thật.');return;}
   if(hash==='#logout'){event.preventDefault();event.stopImmediatePropagation();if(live.pending||live.busy){notify('Chờ lưu xong trước khi đăng xuất.');return;}location.href='/signout-with-chatgpt?return_to=/';return;}
   if(action==='exportprofile'){event.preventDefault();event.stopImmediatePropagation();download({schemaVersion:1,profile:P(),learning:live.states[P().id]},'Nihongo_'+P().id+'.json');return;}
   if(action==='online-resume'){event.preventDefault();event.stopImmediatePropagation();const result=await command({action:'resume',sessionId:el.dataset.id});if(result)go('lesson/resume');else render(false);return;}
   if(!action.startsWith('n5-'))return;
   event.preventDefault();event.stopImmediatePropagation();const a=action.slice(3);
   if(!await flushPersonal()){render(false);return;}
   if(a==='export'){download(live.states[P().id],'Nihongo_Learning_'+P().id+'.json');return;}
   if(['save-summary','save-personal'].includes(a)){
     const s=live.states[P().id].sessions.find(x=>x.id===el.dataset.session);if(!s)return;const sum=E.summary(live.states[P().id],s.id);
     addNote({type:a==='save-summary'?'summary':'sentence',title:a==='save-summary'?'Tổng kết · '+s.definition.title:'Lời giới thiệu của tôi',body:a==='save-summary'?`${sum.correct}/${sum.first.length} câu đúng lần đầu; ${sum.supported.length} có gợi ý; ${sum.repairs.length} lượt sửa riêng.`:[s.personal.name,s.personal.role,s.personal.country].filter(Boolean).join(' · '),source:s.definition.level+' · '+s.definition.title+' · v'+s.contentVersion,target:'summary/'+s.id,dedupe:a+'-'+s.id});return;
   }
   const input={action:a,expected:el.dataset.session&&a!=='resume'?{session:el.dataset.session,unit:el.dataset.unit}:null};
   if(a==='start')Object.assign(input,{contentId:el.dataset.content||baseCatalog.base.id,mode:el.dataset.mode||'lesson',minutes:Number(el.dataset.minutes)||5,includeEarly:el.dataset.early==='true'});
   if(a==='resume')input.sessionId=el.dataset.session;
   if(a==='select')input.option=el.dataset.option;
   if(a==='token')input.token=el.dataset.token;
   if(a==='next'){if(el.dataset.repair)input.repair=el.dataset.repair==='true';input.skipped=el.dataset.skipped==='true';}
   const view=window.NPLessonInteractions?.capture();
   const result=await command(input);if(!result){render(false);window.NPLessonInteractions?.restore(view);return;}
   if(['select','token'].includes(a)){if(!window.NPLessonInteractions?.update(result.state,el))render(false);return;}
   const s=E.active(result.state);
   if(a==='pause')go('today');else if(s?.status==='completed')go('summary/'+encode(s.id));else if(['start','resume'].includes(a))go(s.mode==='practice'?'quiz':'lesson/resume');else render(false);
   window.NPLessonInteractions?.after(a,view,el);
 },true);
 let personalTimer,pendingPersonal={};
 async function flushPersonal(){clearTimeout(personalTimer);const pending=pendingPersonal;pendingPersonal={};for(const [field,value] of Object.entries(pending)){const result=await command({action:'personal',field,value});if(!result){pendingPersonal={...pending,...pendingPersonal};return false;}const el=document.querySelector('[data-n5-personal-preview]'),s=E.active(result.state);if(el)el.textContent=['はじめまして。',s.personal.name?s.personal.name+'です。':'',s.personal.role?s.personal.role+'です。':'',s.personal.country?s.personal.country+'から来ました。':'','よろしくお願いします。'].filter(Boolean).join('\n');}return true;}
 document.addEventListener('input',event=>{if(!event.target.dataset.n5Field)return;event.stopImmediatePropagation();pendingPersonal[event.target.dataset.n5Field]=event.target.value;clearTimeout(personalTimer);personalTimer=setTimeout(flushPersonal,500);},true);
 document.addEventListener('submit',event=>{if(event.target.matches('[data-form="demologin"]')){event.preventDefault();event.stopImmediatePropagation();showProfile(new FormData(event.target).get('learner'));}},true);
 function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 window.addEventListener('beforeunload',event=>{if(live.pending||live.busy||live.unsaved||Object.keys(pendingPersonal).length){event.preventDefault();event.returnValue='';}});
 document.addEventListener('DOMContentLoaded',()=>{
   originalRender=render;render=redraw;
   const bar=document.querySelector('.review-actions');if(bar)bar.insertAdjacentHTML('afterbegin','<span id="online-status" role="status">Đang kết nối…</span>');
   overlay('Đang mở không gian học…','Kiểm tra tài khoản và tiến độ đã lưu.');load();
 });
})();
