/* Reusable learning state machine. Time and randomness are injectable for tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NPLessonEngine=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const stamp=now=>new Date(now||Date.now()).toISOString();
  const nextId=(state,prefix)=>`${state.learnerId}:${prefix}:${++state.sequence}`;
  function create(learnerId){assert(learnerId,'Learner is required');return{schemaVersion:1,learnerId,sequence:0,revision:0,sessions:[],attempts:[],reviews:[],activeSessionId:null,lastAnswerAt:null};}
  const active=state=>state.sessions.find(s=>s.id===state.activeSessionId)||null;
  const latest=state=>state.sessions.filter(s=>s.status==='completed').at(-1)||null;
  const definition=(session,id)=>session.definition.questions.find(q=>q.id===id);
  const unit=session=>session?.units[session.index]||null;
  function shuffled(values,random=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function makeUnit(content,key,random){const value={id:key,...copy(content.units[key])};if(value.type==='question'){const q=content.questions.find(q=>q.id===value.questionId);value.optionOrder=shuffled((q.options||q.tokens).map(x=>x.id),random);}return value;}
  const freshCurrent=()=>({selected:null,order:[],hintUsed:false,feedbackId:null,activeMs:0});
  function due(state,now){const at=stamp(now);return state.reviews.filter(r=>r.dueAt<=at).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));}
  function pending(state){return state.sessions.filter(s=>s.status!=='completed').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
  function start(state,content,options={}){
    const mode=options.mode||'lesson',at=stamp(options.now);
    const old=pending(state).find(s=>s.contentId===content.id&&s.mode===mode);
    if(old){if(active(state)?.id!==old.id)pause(state,at);state.activeSessionId=old.id;old.status='active';old.updatedAt=at;return old;}
    const minutes=Number(options.minutes)<=3?3:Number(options.minutes)<=5?5:15;
    let units;
    if(mode==='review'){
      const pool=options.includeEarly?state.reviews:due(state,at);
      const matching=pool.filter(r=>r.contentId===content.id&&r.contentVersion===content.version);if(options.includeEarly)matching.sort((a,b)=>(a.lastPractisedAt||'').localeCompare(b.lastPractisedAt||''));const selected=matching.slice(0,3);
      if(!selected.length)return null;
      units=selected.map((r,i)=>{const concept=content.concepts.find(c=>c.id===r.conceptId),q=content.questions.find(q=>q.id===concept.questionId);return{id:'review-'+i,type:'question',questionId:q.id,optionOrder:shuffled(q.options.map(o=>o.id),options.random),label:concept.name,seconds:45,reviewId:r.id};});
    }else if(mode==='practice'){
      const keys=content.plans[minutes].filter(id=>content.units[id].type==='question');
      units=keys.map(id=>makeUnit(content,id,options.random));
    }else units=content.plans[minutes].map(id=>makeUnit(content,id,options.random));
    const session={id:nextId(state,'session'),learnerId:state.learnerId,contentId:content.id,contentVersion:content.version,
      definition:copy(content),mode,earlyReview:mode==='review'&&!!options.includeEarly,minutes,priority:options.priority||'adaptive',context:copy(options.context||{}),
      reading:options.reading==='hide'||options.reading==='tap'?'hide':'show',units,index:0,current:freshCurrent(),
      status:'active',startedAt:at,updatedAt:at,completedAt:null,completedUnits:[],repairCount:0,
      personal:{name:options.name||'',role:'',country:'',disposition:null},clockIsDemo:false};
    pause(state,at);state.sessions.push(session);state.activeSessionId=session.id;return session;
  }
  function resume(state,id,now){const s=state.sessions.find(s=>s.id===id&&s.learnerId===state.learnerId&&s.status!=='completed');assert(s,'Session unavailable');if(active(state)?.id!==s.id)pause(state,now);state.activeSessionId=s.id;s.status='active';s.updatedAt=stamp(now);return s;}
  function pause(state,now){const s=active(state);if(s&&s.status!=='completed'){s.status='paused';s.updatedAt=stamp(now);}return s;}
  function select(state,id,now){const s=active(state),u=unit(s);assert(s?.status==='active'&&u?.type==='question'&&!s.current.feedbackId,'Question is locked');const q=definition(s,u.questionId);assert(q.type==='choice'&&q.options.some(o=>o.id===id),'Invalid option');s.current.selected=id;s.updatedAt=stamp(now);}
  function token(state,id,now){const s=active(state),u=unit(s);assert(s?.status==='active'&&u?.type==='question'&&!s.current.feedbackId,'Question is locked');const q=definition(s,u.questionId);assert(q.type==='order'&&q.tokens.some(t=>t.id===id),'Invalid token');const pos=s.current.order.indexOf(id);if(pos>=0)s.current.order.splice(pos,1);else s.current.order.push(id);s.updatedAt=stamp(now);}
  function hint(state,now){const s=active(state);assert(s?.status==='active'&&unit(s)?.type==='question'&&!s.current.feedbackId,'Question is locked');s.current.hintUsed=true;s.updatedAt=stamp(now);}
  function canCheck(session){const u=unit(session);if(!u||u.type!=='question'||session.current.feedbackId)return false;const q=definition(session,u.questionId);return q.type==='choice'?q.options.some(o=>o.id===session.current.selected):session.current.order.length===q.answer.length;}
  function nextDay(now,days){
    // Calendar days in Asia/Tokyo, retaining the same local time (UTC+9 has no DST).
    return new Date(new Date(stamp(now)).getTime()+days*86400000).toISOString();
  }
  function schedule(state,session,q,attempt,now){
    let r=state.reviews.find(r=>r.contentId===session.contentId&&r.contentVersion===session.contentVersion&&r.conceptId===q.conceptId);
    if(!r){r={id:nextId(state,'review'),learnerId:state.learnerId,contentId:session.contentId,contentVersion:session.contentVersion,conceptId:q.conceptId,stage:0,intervalDays:1,dueAt:nextDay(now,1),lapses:0,lastAttemptId:null};state.reviews.push(r);}
    const independent=attempt.correct&&!attempt.hintUsed;
    if(attempt.kind==='repair'){
      // Immediate repair is evidence of correction, never proof of delayed retention.
      r.lastRepairAttemptId=attempt.id;return r;
    }
    if(attempt.kind==='review'){
      if(!independent){r.stage=0;r.intervalDays=1;r.lapses+=attempt.correct?0:1;r.dueAt=nextDay(now,1);}
      else if(r.dueAt<=stamp(now)){r.stage=Math.min(2,r.stage+1);r.intervalDays=[1,3,7][r.stage];r.dueAt=nextDay(now,r.intervalDays);}
      // Early review does not postpone an already planned review or advance its stage.
    }else if(!independent){r.stage=0;r.intervalDays=1;r.lapses+=attempt.correct?0:1;r.dueAt=nextDay(now,1);}
    // All first-session successes still receive a next-day recall check.
    r.lastAttemptId=attempt.id;r.lastPractisedAt=stamp(now);return r;
  }
  function check(state,now){
    const s=active(state);assert(s?.status==='active'&&canCheck(s),'Choose a complete answer first');
    const u=unit(s),q=definition(s,u.questionId),selected=q.type==='choice'?s.current.selected:[...s.current.order];
    const correct=q.type==='choice'?selected===q.answer:JSON.stringify(selected)===JSON.stringify(q.answer);
    const a={id:nextId(state,'attempt'),learnerId:state.learnerId,sessionId:s.id,unitId:u.id,contentId:s.contentId,contentVersion:s.contentVersion,questionId:s.contentId+':'+q.id,questionLocalId:q.id,questionVersion:q.version||1,conceptId:q.conceptId,kind:u.repairFor?'repair':s.mode==='review'?'review':q.id==='transfer'?'transfer':'practice',repairFor:u.repairFor||null,
      selected,correct,reviewTiming:s.mode==='review'?(state.reviews.find(r=>r.id===u.reviewId)?.dueAt>stamp(now)?'early':'due'):null,hintUsed:s.current.hintUsed,readingShown:s.reading==='show',responseMs:Math.round(s.current.activeMs),timing:'visible-window-estimate',definition:copy(q),at:stamp(now)};
    state.attempts.push(a);s.current.feedbackId=a.id;s.updatedAt=stamp(now);state.lastAnswerAt=a.at;
    schedule(state,s,q,a,now);return a;
  }
  function repairOffer(state){
    const s=active(state),u=unit(s);if(!u||!s.current.feedbackId||u.repairFor||s.mode==='review'||s.repairCount>=2)return null;
    const a=state.attempts.find(a=>a.id===s.current.feedbackId),q=definition(s,u.questionId);
    if(!a||a.correct&&!a.hintUsed||!q.repairId)return null;
    const fits=s.units.reduce((n,u)=>n+u.seconds,0)+30<=s.minutes*60;
    return {questionId:q.repairId,attemptId:a.id,automatic:s.priority==='adaptive'&&fits,fits};
  }
  function advance(state,options={}){
    const s=active(state),u=unit(s);assert(s?.status==='active'&&u,'No active step');
    if(u.type==='question')assert(s.current.feedbackId,'Check your answer first');
    if(u.type==='personal'){s.personal.disposition=options.skipped?'skipped':'self-reported';s.personal.at=stamp(options.now);}
    const offer=repairOffer(state);
    if(offer&&offer.fits&&(options.repair===true||options.repair!==false&&offer.automatic)){
      const q=definition(s,offer.questionId);s.units.splice(s.index+1,0,{id:'repair-'+offer.attemptId,type:'question',questionId:q.id,repairFor:offer.attemptId,optionOrder:shuffled(q.options.map(o=>o.id),options.random),seconds:30,label:'Gỡ một chỗ vướng'});s.repairCount++;
    }
    s.completedUnits.push({id:u.id,type:u.type,at:stamp(options.now),disposition:u.type==='personal'?s.personal.disposition:u.type==='question'?'answered':'viewed'});
    s.index++;s.current=freshCurrent();s.updatedAt=stamp(options.now);
    if(s.index>=s.units.length){s.status='completed';s.completedAt=s.updatedAt;return 'completed';}
    return 'continue';
  }
  function summary(state,id){
    const s=id?state.sessions.find(s=>s.id===id&&s.learnerId===state.learnerId):latest(state);if(!s)return null;
    const answers=state.attempts.filter(a=>a.sessionId===s.id),first=answers.filter(a=>a.kind!=='repair'),repairs=answers.filter(a=>a.kind==='repair');
    const independent=first.filter(a=>a.correct&&!a.hintUsed),supported=first.filter(a=>a.correct&&a.hintUsed),incorrect=first.filter(a=>!a.correct);
    return{session:s,answers,first,repairs,independent,supported,incorrect,correct:first.filter(a=>a.correct).length,
      concepts:[...new Set(first.map(a=>a.conceptId))],reviews:state.reviews.filter(r=>r.contentId===s.contentId&&r.contentVersion===s.contentVersion&&first.some(a=>a.conceptId===r.conceptId))};
  }
  return{create,copy,active,latest,unit,definition,start,resume,pause,select,token,hint,canCheck,check,advance,summary,repairOffer,due,pending,nextDay};
});
