/* Shared authoring contract: browser editor, preview and CLI use the same checks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NPContentModel=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const slug=/^[a-z][a-z0-9-]{0,63}$/;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const object=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
  function canEdit(c,{characterIds}={}){
    const row=x=>object(x)&&slug.test(x.id||''),strings=(o,keys)=>keys.every(k=>typeof o[k]==='string'),unique=rows=>new Set(rows.map(x=>x.id)).size===rows.length;
    const safe=value=>!value||typeof value!=='object'||Object.keys(value).every(k=>!['__proto__','constructor','prototype'].includes(k)&&safe(value[k]));
    if(!object(c)||!safe(c)||!slug.test(c.id||'')||['resume','review','preview'].includes(c.id)||!strings(c,['title'])||c.level!=='N5'||c.locale!=='vi'||!Number.isInteger(c.version)||c.version<1)return false;
    if(!['cast','story','concepts','questions'].every(k=>Array.isArray(c[k])&&c[k].length)||!['cards','units','plans','readings'].every(k=>object(c[k])))return false;
    if(c.engine!==undefined&&c.engine!=='lesson/v1'||c.template!==undefined&&c.template!=='self-introduction/v1')return false;
    if(c.questions.length>80||c.story.length>40||c.cast.length>25||c.concepts.length>40||Object.keys(c.units).length>160||Object.keys(c.cards).length>30||Object.keys(c.readings).length>300)return false;
    if(!c.cast.every(p=>row(p)&&strings(p,['name','role'])&&p.name.trim()&&p.role.trim()&&(!characterIds||characterIds.includes(p.id)))||!unique(c.cast))return false;
    if(!c.story.every(s=>object(s)&&strings(s,['speaker','text','meaning']))||!c.concepts.every(x=>row(x)&&strings(x,['name','questionId']))||!unique(c.concepts)||!c.questions.every(row)||!unique(c.questions))return false;
    for(const q of c.questions){if(!strings(q,['prompt','stimulus','hint','explanation','conceptId']))return false;if(q.type==='choice'){if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!q.options.every(o=>row(o)&&strings(o,['text','why']))||!unique(q.options)||typeof q.answer!=='string')return false;}else if(q.type==='order'){if(!Array.isArray(q.tokens)||q.tokens.length<2||q.tokens.length>12||!q.tokens.every(t=>row(t)&&strings(t,['text']))||!unique(q.tokens)||!Array.isArray(q.answer)||q.answer.length!==q.tokens.length||new Set(q.answer).size!==q.tokens.length||q.answer.some(id=>!q.tokens.some(t=>t.id===id)))return false;}else return false;}
    for(const [id,card] of Object.entries(c.cards))if(!slug.test(id)||!object(card)||!strings(card,['title','example','meaning','pattern','pitfall'])||!Array.isArray(card.points)||card.points.some(x=>typeof x!=='string'))return false;
    for(const [id,u] of Object.entries(c.units))if(!slug.test(id)||!object(u)||!['story','learn','question','personal'].includes(u.type)||typeof u.seconds!=='number'||u.type==='question'&&!c.questions.some(q=>q.id===u.questionId)||u.type==='learn'&&!own(c.cards,u.cardId))return false;
    if(![3,5,15].every(m=>Array.isArray(c.plans[m])&&c.plans[m].every(id=>own(c.units,id))))return false;
    if(c.headline!==undefined&&(!Array.isArray(c.headline)||c.headline.some(x=>typeof x!=='string')))return false;
    return Object.entries(c.readings).every(([word,kana])=>word.trim()&&word.length<=40&&typeof kana==='string');
  }
  function fingerprint(value){const ordered=v=>Array.isArray(v)?v.map(ordered):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])])):v;const text=JSON.stringify(ordered(value));let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
  function validate(c,{characterIds}={}){
    const issues=[];
    const add=(path,message,tab='overview',itemId=null,severity='error')=>issues.push({path,message,tab,itemId,severity});
    if(!object(c)){add('','Nội dung phải là một đối tượng bài học.');return issues;}
    function scan(value,path=''){
      if(!value||typeof value!=='object')return;
      for(const key of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(key))add(path,'Không nhận khóa dữ liệu “'+key+'”.');else scan(value[key],path?path+'.'+key:key);}
    }
    scan(c);if(issues.length)return issues;
    const text=(value,path,label,tab='overview',id=null,max=4000)=>{if(typeof value!=='string'||!value.trim())add(path,label+' còn trống.',tab,id);else if(value.length>max)add(path,label+' vượt giới hạn '+max+' ký tự.',tab,id);};
    text(c.title,'title','Tên bài','overview',null,160);
    if(c.headline!==undefined&&(!Array.isArray(c.headline)||!c.headline.length||c.headline.length>2||c.headline.some(s=>typeof s!=='string'||!s.trim()||s.length>160)))add('headline','Tiêu đề mở đầu cần một hoặc hai dòng ngắn.');
    if(!slug.test(c.id||'')||['resume','review','preview'].includes(c.id))add('id','Mã bài dùng chữ thường, số và dấu gạch; không dùng mã dành cho điều hướng.');
    if(!Number.isInteger(c.version)||c.version<1)add('version','Phiên bản phải là số nguyên dương.');
    if(c.level!=='N5')add('level','Mẫu bài hiện hỗ trợ N5. Mức khác cần mẫu nội dung được review riêng.');
    if(c.engine!==undefined&&c.engine!=='lesson/v1')add('engine','Bộ hiển thị của nội dung này chưa được hỗ trợ.');
    if(c.template!==undefined&&c.template!=='self-introduction/v1')add('template','Mẫu nội dung này chưa có form biên tập tương ứng.');
    if(c.locale!=='vi')add('locale','Bản mẫu biên soạn hiện dùng ngôn ngữ giải thích tiếng Việt.');
    if(c.sourceUrl){try{if(new URL(c.sourceUrl).protocol!=='https:')throw 0;}catch{add('sourceUrl','Nguồn tham khảo cần URL https hợp lệ.');}}
    const arrays={cast:c.cast,story:c.story,concepts:c.concepts,questions:c.questions};
    for(const [key,value] of Object.entries(arrays))if(!Array.isArray(value)||!value.length)add(key,'Thiếu danh sách '+({cast:'nhân vật',story:'hội thoại',concepts:'mẫu cần nhớ',questions:'câu hỏi'}[key]),key==='questions'?'questions':'content');
    if(!object(c.cards))add('cards','Thiếu khối giải thích.','content');
    if(!object(c.units))add('units','Thiếu danh sách bước học.','plans');
    if(!object(c.plans))add('plans','Thiếu phiên học 3/5/15 phút.','plans');
    if(!object(c.readings))add('readings','Cách đọc cần là danh sách từ và Kana.','content');
    if(issues.some(i=>i.path in arrays||['cards','units','plans','readings'].includes(i.path)))return issues;
    if(c.questions.length>80||c.story.length>40||c.cast.length>25||c.concepts.length>40||Object.keys(c.units).length>160||Object.keys(c.cards).length>30||Object.keys(c.readings).length>300){add('','Bài quá lớn cho mẫu biên tập này; hãy chia thành bài nhỏ.');return issues;}
    const unique=(rows,path,tab)=>{const seen=new Set();rows.forEach((row,i)=>{if(!object(row)||!slug.test(row.id||''))add(path+'.'+i+'.id','Mã mục không hợp lệ.',tab,row?.id);else if(seen.has(row.id))add(path+'.'+i+'.id','Mã “'+row.id+'” bị trùng.',tab,row.id);else seen.add(row.id);});return seen;};
    const castIds=unique(c.cast,'cast','content'),conceptIds=unique(c.concepts,'concepts','content'),qids=unique(c.questions,'questions','questions');
    if([c.cast,c.concepts,c.questions].some(rows=>rows.some(row=>!object(row))))return issues;
    c.cast.forEach((person,i)=>{text(person.name,`cast.${i}.name`,'Tên nhân vật','content');text(person.role,`cast.${i}.role`,'Vai trò nhân vật','content');if(characterIds&&!characterIds.includes(person.id))add(`cast.${i}.id`,'Nhân vật chưa có hồ sơ trong thế giới của bài học.','content');});
    c.story.forEach((line,i)=>{if(!castIds.has(line?.speaker))add(`story.${i}.speaker`,'Lượt thoại cần nhân vật có trong bài.','content');text(line?.text,`story.${i}.text`,'Lời thoại tiếng Nhật','content');text(line?.meaning,`story.${i}.meaning`,'Nghĩa tiếng Việt','content');});
    for(const [id,card] of Object.entries(c.cards)){
      if(!slug.test(id)||!object(card)){add('cards.'+id,'Khối giải thích không hợp lệ.','content');continue;}
      for(const [key,label] of Object.entries({title:'Tên khối',example:'Ví dụ',meaning:'Nghĩa ví dụ',pattern:'Mẫu câu',pitfall:'Lưu ý dễ nhầm'}))text(card[key],`cards.${id}.${key}`,label,'content');
      if(!Array.isArray(card.points)||!card.points.length||card.points.some(p=>typeof p!=='string'||!p.trim()))add(`cards.${id}.points`,'Cần ít nhất một ý giải thích có nội dung.','content');
    }
    c.questions.forEach((q,i)=>{
      if(!object(q))return;
      const at=key=>`questions.${i}.${key}`;
      if(q.version!==undefined&&(!Number.isInteger(q.version)||q.version<1))add(at('version'),'Phiên bản câu hỏi phải là số nguyên dương.','questions',q.id);
      for(const [key,label] of Object.entries({prompt:'Câu hỏi',stimulus:'Ngữ cảnh',hint:'Gợi ý',explanation:'Giải thích đáp án'}))text(q[key],at(key),label,'questions',q.id);
      if(!conceptIds.has(q.conceptId))add(at('conceptId'),'Câu hỏi chưa gắn mẫu cần nhớ hợp lệ.','questions',q.id);
      if(q.type==='choice'){
        if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6){add(at('options'),'Trắc nghiệm cần 2–6 lựa chọn.','questions',q.id);return;}
        const options=unique(q.options,at('options'),'questions');
        q.options.forEach((o,j)=>{text(o?.text,at(`options.${j}.text`),'Nội dung lựa chọn','questions',q.id);text(o?.why,at(`options.${j}.why`),'Lý do đúng/sai của lựa chọn','questions',q.id);});
        if(!options.has(q.answer))add(at('answer'),'Chưa chọn một đáp án đúng trong các lựa chọn.','questions',q.id);
        const labels=q.options.map(o=>String(o?.text||'').trim());if(new Set(labels).size!==labels.length)add(at('options'),'Các lựa chọn đang trùng nội dung.','questions',q.id);
      }else if(q.type==='order'){
        if(!Array.isArray(q.tokens)||q.tokens.length<2||q.tokens.length>12){add(at('tokens'),'Ghép câu cần 2–12 mảnh.','questions',q.id);return;}
        const tokens=unique(q.tokens,at('tokens'),'questions');q.tokens.forEach((t,j)=>text(t?.text,at(`tokens.${j}.text`),'Mảnh câu','questions',q.id));
        if(!Array.isArray(q.answer)||q.answer.length!==tokens.size||new Set(q.answer).size!==tokens.size||q.answer.some(id=>!tokens.has(id)))add(at('answer'),'Đáp án ghép câu phải dùng mỗi mảnh đúng một lần.','questions',q.id);
      }else add(at('type'),'Dạng câu hiện hỗ trợ trắc nghiệm hoặc ghép câu.','questions',q.id);
      if(q.repairId){const target=c.questions.find(x=>x?.id===q.repairId);if(!target||target.id===q.id||target.type!=='choice'||target.repairId||target.conceptId!==q.conceptId)add(at('repairId'),'Câu sửa cần là câu trắc nghiệm khác, cùng mẫu và không tạo vòng sửa lỗi.','questions',q.id);}
    });
    c.concepts.forEach((concept,i)=>{text(concept.name,`concepts.${i}.name`,'Tên mẫu cần nhớ','content');const q=c.questions.find(q=>q?.id===concept.questionId);if(!q||q.type!=='choice'||q.conceptId!==concept.id)add(`concepts.${i}.questionId`,'Câu ôn cần là trắc nghiệm thuộc đúng mẫu này.','content');});
    for(const [key,value] of Object.entries(c.readings)){if(!key.trim()||key.length>40||typeof value!=='string'||!value.trim()||value.length>80)add('readings','Từ và cách đọc không được trống hoặc quá dài.','content');}
    for(const [id,u] of Object.entries(c.units)){
      if(!slug.test(id)||!object(u)){add('units.'+id,'Bước học không hợp lệ.','plans');continue;}
      if(!['story','learn','question','personal'].includes(u.type))add('units.'+id+'.type','Loại bước chưa được hỗ trợ.','plans');
      if(!Number.isFinite(u.seconds)||u.seconds<10||u.seconds>600)add('units.'+id+'.seconds','Ước lượng bước cần từ 10 đến 600 giây.','plans');
      if(u.type==='question'&&!qids.has(u.questionId))add('units.'+id+'.questionId','Bước đang trỏ tới câu hỏi không có.','plans');
      if(u.type==='learn'&&!own(c.cards,u.cardId))add('units.'+id+'.cardId','Bước đang trỏ tới khối giải thích không có.','plans');
    }
    for(const minutes of [3,5,15]){
      const plan=c.plans[minutes],path='plans.'+minutes;
      if(!Array.isArray(plan)||!plan.length){add(path,'Thiếu phiên '+minutes+' phút.','plans');continue;}
      if(new Set(plan).size!==plan.length)add(path,'Một bước đang lặp lại trong cùng phiên.','plans');
      let seconds=0,questions=0;for(const id of plan){if(!own(c.units,id)){add(path,'Bước “'+id+'” không còn tồn tại.','plans');continue;}const u=c.units[id];seconds+=u.seconds||0;questions+=u.type==='question'?1:0;}
      if(!questions)add(path,'Phiên cần ít nhất một câu thử nhớ có phản hồi.','plans');
      if(seconds>minutes*60)add(path,`Phiên ${minutes} phút đang dài ${Math.ceil(seconds/60)} phút; giảm bước hoặc thời gian.`,'plans');
      if(seconds&&seconds<minutes*30)add(path,'Phiên ngắn hơn quỹ thời gian đã chọn. Không cần thêm nội dung để lấp đầy.','plans',null,'warning');
    }
    const used=new Set(Object.values(c.plans).filter(Array.isArray).flat());
    for(const id of Object.keys(c.units))if(!used.has(id))add('units.'+id,'Bước “'+id+'” chưa nằm trong phiên nào.','plans',null,'warning');
    if(!c.storyTitle||!c.storyIntro)add('storyTitle','Nên thêm tiêu đề và bối cảnh riêng cho hội thoại.','overview',null,'warning');
    return issues;
  }
  function create(base,seeds=[]){return{schemaVersion:1,revision:0,sequence:0,drafts:copy(seeds),releases:[],events:[],baseId:base.id};}
  const versions=(state,base,id)=>[...(base.id===id?[{content:base,source:'bundled',releasedAt:null,review:null}]:[]),...state.releases.filter(r=>r.content.id===id)].sort((a,b)=>a.content.version-b.content.version);
  const get=(state,base,id,version)=>{const all=versions(state,base,id);return copy(version?all.find(r=>r.content.version===Number(version))?.content||null:all.at(-1)?.content||null);};
  function catalog(state,base){return [...new Set([base.id,...state.releases.map(r=>r.content.id)])].map(id=>get(state,base,id));}
  function editable(state,id){const draft=state.drafts.find(d=>d.id===id);if(!draft||draft.status!=='draft')throw new Error('Bản này đã khóa hoặc không còn tồn tại. Tạo bản nháp mới để chỉnh.');return draft;}
  function event(state,type,draft,at,detail={}){state.events.push({id:'content-event-'+(++state.sequence),type,draftId:draft.id,contentId:draft.content.id,at,...detail});}
  function fork(state,base,content,{newId,now=new Date().toISOString()}={}){
    const latest=get(state,base,content.id),clone=copy(content),id='draft-'+(++state.sequence);
    if(newId){if(!slug.test(newId)||catalog(state,base).some(c=>c.id===newId)||state.drafts.some(d=>d.content.id===newId))throw new Error('Mã bài mới không hợp lệ hoặc đã tồn tại.');clone.id=newId;clone.title+=' · Bản mới';clone.version=1;}
    else clone.version=(latest?.version||0)+1;
    clone.engine='lesson/v1';clone.template='self-introduction/v1';clone.translationKey='lesson.'+clone.id+'.v'+clone.version;
    const draft={id,status:'draft',revision:0,baseVersion:newId?0:latest?.version||0,content:clone,updatedAt:now,review:{by:'',rights:'original',note:'',confirmed:false}};
    state.drafts.push(draft);event(state,'draft-created',draft,now);return draft;
  }
  function save(state,id,content,review,expectedRevision,now=new Date().toISOString()){
    const d=editable(state,id);if(d.revision!==expectedRevision)throw new Error('Bản nháp đã thay đổi ở cửa sổ khác. Tải lại trước khi lưu.');
    if(content.id!==d.content.id)throw new Error('Mã bài ổn định không được đổi trong bản nháp. Hãy nhân bản để tạo bài khác.');
    d.content=copy(content);d.review=copy(review);if(d.review.confirmed&&d.review.contentFingerprint!==fingerprint(d.content))d.review.confirmed=false;d.revision++;d.updatedAt=now;event(state,'draft-saved',d,now);return d;
  }
  function changedPaths(a,b,path=''){
    if(JSON.stringify(a)===JSON.stringify(b))return[];
    if(object(a)&&object(b))return[...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>changedPaths(a[k],b[k],path?path+'.'+k:k));
    return[path||'content'];
  }
  function publish(state,base,id,expectedRevision,now=new Date().toISOString(),options={}){
    const d=editable(state,id);if(d.revision!==expectedRevision)throw new Error('Bản nháp đã thay đổi; cần kiểm tra lại bản mới.');
    const errors=validate(d.content,options).filter(i=>i.severity==='error');if(errors.length)throw new Error('Còn '+errors.length+' lỗi cần sửa trước khi phát hành.');
    if(!d.review?.by?.trim()||!d.review.confirmed||d.review.contentFingerprint!==fingerprint(d.content)||!['original','licensed'].includes(d.review.rights)||d.review.rights==='licensed'&&!d.review.note?.trim())throw new Error('Cần người duyệt, xác nhận đúng nội dung đang lưu và thông tin quyền sử dụng.');
    const prior=get(state,base,d.content.id),latest=prior?.version||0;if(d.baseVersion!==latest)throw new Error('Đã có phiên bản mới hơn. Tạo nháp từ bản mới nhất để tránh ghi đè.');
    const content=copy(d.content);content.version=latest+1;content.engine='lesson/v1';content.template='self-introduction/v1';content.translationKey='lesson.'+content.id+'.v'+content.version;content.status='authored-sample';content.questions=content.questions.map(q=>{const old=prior?.questions.find(x=>x.id===q.id),clean=x=>{const v=copy(x);delete v.version;return v;};return{...q,version:old?JSON.stringify(clean(old))===JSON.stringify(clean(q))?old.version||1:(old.version||1)+1:1};});
    const release={content,source:'browser-demo',releasedAt:now,review:copy(d.review),changes:changedPaths(prior,content).filter(p=>p!=='version')};
    state.releases.push(release);d.status='published';d.publishedVersion=content.version;event(state,'demo-published',d,now,{version:content.version});return release;
  }
  function importDraft(state,base,payload,now=new Date().toISOString(),options={}){
    const content=payload?.format==='nihongo-content/v1'?payload.content:payload;
    const errors=validate(content,options).filter(i=>i.severity==='error');if(!canEdit(content,options))throw new Error('Gói chưa có cấu trúc biên tập an toàn: '+(errors[0]?.message||'Kiểm tra kiểu dữ liệu và các mã tham chiếu.'));
    const latest=get(state,base,content.id),draft=fork(state,base,content,{now});draft.baseVersion=latest?.version||0;draft.content.version=draft.baseVersion+1;draft.review={by:'',rights:'',note:'',confirmed:false};return draft;
  }
  function reviewContent(state,base,learning,{now=new Date().toISOString(),includeEarly=false}={}){
    const pending=learning.sessions.filter(s=>s.mode==='review'&&s.status!=='completed').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
    if(pending)return copy(pending.definition);
    const pool=learning.reviews.filter(r=>includeEarly||r.dueAt<=now).slice().sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
    for(const r of pool){const found=get(state,base,r.contentId,r.contentVersion)||learning.sessions.find(s=>s.contentId===r.contentId&&s.contentVersion===r.contentVersion)?.definition;if(found)return copy(found);}
    return null;
  }
  return{copy,validate,canEdit,create,versions,get,catalog,fork,save,publish,changedPaths,importDraft,reviewContent,fingerprint};
});
