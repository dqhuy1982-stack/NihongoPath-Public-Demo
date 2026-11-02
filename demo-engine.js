/* Pure design-simulation rules. No network, UI globals, or production storage. */
(function (root, factory) {
  const policy = typeof module === 'object' && module.exports ? require('./advice-policy.js') : root.NPAdvicePolicy;
  const api = factory(policy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NPDemoEngine = api;
})(typeof window === 'undefined' ? globalThis : window, function (policy) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const owned = (rows, id) => rows.filter(row => row.learnerId === id);
  const qById = (seed, id) => seed.questions.find(q => q.id === id);
  const contentById = (seed, id) => seed.content.find(c => c.id === id);
  const now = state => new Date(new Date(state.asOf).getTime() + state.tick * 1000).toISOString();
  const id = (state, prefix) => `${prefix}-${++state.sequence}`;

  function create(seed) {
    const first = seed.scenarios.find(s => s.id === 'commute') || seed.scenarios[0];
    return { schemaVersion: 1, seedVersion: seed.meta.seedVersion, asOf: seed.meta.asOf,
      revision: 0, sequence: 1000, tick: 0, learnerId: first.learnerId, scenarioId: first.id,
      context: copy(first.context), attempts: copy(seed.attempts), reviews: copy(seed.reviews),
      sessions: copy(seed.sessions), learnerUpdates: {}, run: null, lastSummary: null };
  }
  function learner(seed, state) {
    const base = seed.learners.find(l => l.id === state.learnerId);
    return { ...base, ...state.learnerUpdates[state.learnerId] };
  }
  function selectScenario(seed, state, scenarioId) {
    const s = seed.scenarios.find(x => x.id === scenarioId);
    if (!s) throw new Error('Unknown scenario');
    state.scenarioId = s.id; state.learnerId = s.learnerId;
    state.context = copy(s.context); state.run = null;
  }
  function facts(seed, state) {
    const l = learner(seed, state), attempts = owned(state.attempts, l.id);
    const due = owned(state.reviews, l.id).filter(r => r.dueAt <= now(state));
    const pending = owned(state.sessions, l.id).filter(s => s.status !== 'completed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const counts = new Map();
    for (const a of attempts) {
      const rec = counts.get(a.questionId) || { wrong: 0, slow: 0, last: null };
      if (!a.correct && !a.hintUsed) rec.wrong++;
      if (a.correct && !a.hintUsed && a.responseMs > 5000 && qById(seed, a.questionId)?.skill === 'kana-recognition') rec.slow++;
      if (!rec.last || a.at >= rec.last.at) rec.last = a;
      counts.set(a.questionId, rec);
    }
    const repeated = due.map(r => ({ ...r, ...counts.get(r.questionId) }))
      .filter(r => r.wrong >= 3 && !r.last?.correct).sort((a,b)=>b.wrong-a.wrong);
    const slow = due.map(r => ({ ...r, ...counts.get(r.questionId) })).find(r => r.slow >= 3);
    return { learner: l, attempts, due, pending, repeated, slow,
      gap: l.lastStudyAt ? Math.max(0, Math.floor((new Date(now(state)) - new Date(l.lastStudyAt)) / 86400000)) : null };
  }
  function plan(seed, state) {
    const f = facts(seed, state), c = state.context, l = f.learner;
    const budget = [3,5,15,30].includes(c.minutes) ? c.minutes : 5;
    const scenario = seed.scenarios.find(s => s.id === state.scenarioId);
    const rules = ['availability'];
    if (c.place !== 'desk') rules.push('environment');
    const required = contentById(seed,f.pending[0]?.contentId)?.requiredSkillIds || [];
    const decision=policy.choose({mode:l.studyPriority,gapDays:f.gap,isNew:!f.attempts.length&&!l.completed,
      hasPending:f.pending.length>0,dueCount:f.due.length,hasRepeated:f.repeated.length>0,hasSlow:!!f.slow,
      blockingRepeated:f.repeated.some(r=>required.includes(qById(seed,r.questionId)?.skill)),
      blockingSlow:!!f.slow&&required.includes(qById(seed,f.slow.questionId)?.skill)});
    const kind=decision.kind;rules.push(...decision.rules);
    const items = []; let remaining = kind === 'return' ? Math.min(5,budget) : budget;
    const eligible = seed.content.filter(x => x.status === 'demo' &&
      seed.modules.some(m => m.id === x.moduleId && m.status === 'demo') &&
      (!x.requirements.audio || c.headphones) && (!x.requirements.speech || c.speech) &&
      (!x.requirements.writing || c.place === 'desk'));
    const addReview = () => {
      const prioritized = [...f.due].sort((a,b) => {
        const rank = r => f.repeated.some(x=>x.questionId===r.questionId) ? 0 : f.slow?.questionId===r.questionId ? 1 : 2;
        return rank(a)-rank(b) || a.dueAt.localeCompare(b.dueAt);
      });
      const n = Math.min(3, remaining, prioritized.length);
      if (!n) return;
      items.push({ kind: 'review', title: ['Gọi lại điều đã học','Recall what you learned','学んだことを思い出す'], minutes:n,
        questionIds:prioritized.slice(0,n).map(r=>r.questionId), contentId:null, sessionId:null });
      remaining -= n;
    };
    const addLesson = (session = null) => {
      const activity = session ? contentById(seed, session.contentId) : eligible.find(x=>x.level === l.target && x.kind === 'lesson');
      if (!activity || !eligible.some(x=>x.id===activity.id)) return;
      const start = session?.index || 0;
      const n = Math.min(activity.questionIds.length-start, Math.floor(remaining/2));
      if (n <= 0) return;
      items.push({kind:session?'resume':'lesson',title:activity.title,minutes:n*2,contentId:activity.id,
        sessionId:session?.id||null,questionIds:activity.questionIds.slice(start,start+n),segmentEnd:start+n});
      remaining -= n*2;
    };
    if (kind==='new') addLesson();
    else {
      if (['repair','recall','return','review'].includes(kind)) addReview();
      if (kind!=='return') addLesson(f.pending[0]);
      if (items.length===0 || !items.some(x=>x.kind==='review')) addReview();
    }
    // Longer quiet sessions can include the existing authored mini set. Never invent filler.
    if (remaining>=8 && c.place==='desk' && kind!=='return' && kind!=='new') {
      const activity=eligible.find(x=>x.level===l.target && x.kind==='practice');
      if(activity){items.push({kind:'practice',title:activity.title,minutes:8,contentId:activity.id,sessionId:null,questionIds:activity.questionIds,segmentEnd:activity.questionIds.length});remaining-=8;}
    }
    const fallback = scenario?.requestedModule && !seed.modules.some(m=>m.id===scenario.requestedModule && m.status==='demo');
    return { kind, mode:decision.mode, budget, used:items.reduce((n,x)=>n+x.minutes,0), items, rules:[...new Set(rules)], facts:f, fallback:!!fallback };
  }
  function startItem(seed, state, item) {
    let s = item.sessionId && state.sessions.find(x=>x.id===item.sessionId && x.learnerId===state.learnerId);
    if (!s && item.contentId) s=owned(state.sessions,state.learnerId).find(x=>x.contentId===item.contentId && x.status!=='completed');
    if (!s) {
      const content = contentById(seed,item.contentId);
      s = {id:id(state,'session'),learnerId:state.learnerId,contentId:item.contentId || qById(seed,item.questionIds[0]).contentId,
        contentVersion:content?.version||1,questionIds:item.kind==='lesson'?copy(content.questionIds):copy(item.questionIds),
        index:0,phase:'question',status:'active',checkedAttemptIds:[],selected:null,hintUsed:false,
        startedAt:now(state),updatedAt:now(state),completedAt:null,kind:item.kind};
      state.sessions.push(s);
    }
    const available = Math.min(item.questionIds.length,s.questionIds.length-s.index);
    s.segmentEnd=s.index+available;s.segmentStart=s.index;s.status='active';s.updatedAt=now(state);
    return s;
  }
  function start(seed,state) {
    const p = plan(seed,state);
    if(!p.items.length) return null;
    state.run={learnerId:state.learnerId,items:copy(p.items),index:0,sessionId:null,budget:p.budget,used:p.used};
    const s=startItem(seed,state,state.run.items[0]);state.run.sessionId=s.id;return s;
  }
  function activeSession(state) {
    if(state.run?.learnerId!==state.learnerId)return null;
    return state.sessions.find(s=>s.id===state.run.sessionId && s.learnerId===state.learnerId) || null;
  }
  function answer(seed,state,selected,responseMs) {
    const s=activeSession(state);
    if(!s || s.phase!=='question' || s.status!=='active')throw new Error('No active unanswered question');
    const q=qById(seed,s.questionIds[s.index]);
    if(!Number.isInteger(selected)||selected<0||selected>=q.options.length)throw new Error('Invalid answer');
    const a={id:id(state,'answer'),learnerId:state.learnerId,questionId:q.id,questionVersion:q.version,contentVersion:q.contentVersion||q.version,sessionId:s.id,
      selected,correct:selected===q.answer,hintUsed:s.hintUsed,responseMs:Math.max(0,Math.round(responseMs||0)),at:now(state),
      source:'demo-interaction',definition:copy(q)};
    state.attempts.push(a);s.checkedAttemptIds.push(a.id);s.phase='feedback';s.selected=selected;s.updatedAt=now(state);
    let r=state.reviews.find(r=>r.learnerId===state.learnerId && r.questionId===q.id);
    if(!r){r={id:id(state,'review'),learnerId:state.learnerId,questionId:q.id,questionVersion:q.version,lapses:0};state.reviews.push(r);}
    r.intervalDays=a.correct&&!a.hintUsed?3:1;r.lapses+=a.correct?0:1;
    r.dueAt=new Date(new Date(now(state)).getTime()+r.intervalDays*86400000).toISOString();
    state.learnerUpdates[state.learnerId]={...state.learnerUpdates[state.learnerId],lastStudyAt:now(state)};
    state.tick++;return a;
  }
  function next(seed,state) {
    const s=activeSession(state);if(!s||s.phase!=='feedback')throw new Error('Check answer first');
    s.index++;s.selected=null;s.hintUsed=false;s.phase='question';s.updatedAt=now(state);
    if(s.index>=s.segmentEnd){
      s.status=s.index>=s.questionIds.length?'completed':'paused';
      if(s.status==='completed')s.completedAt=now(state);
      const answers=s.checkedAttemptIds.map(a=>state.attempts.find(x=>x.id===a)).filter(a=>a&&a.source==='demo-interaction');
      state.lastSummary={learnerId:state.learnerId,sessionId:s.id,answers:answers.slice(-(s.segmentEnd-s.segmentStart)),partial:s.status!=='completed',at:now(state)};
      state.run.index++;return 'summary';
    }
    return 'question';
  }
  function continueRun(seed,state){
    const run=state.run;if(!run||run.learnerId!==state.learnerId||run.index>=run.items.length)return null;
    const s=startItem(seed,state,run.items[run.index]);run.sessionId=s.id;return s;
  }
  function pause(state){const s=activeSession(state);if(s&&s.status==='active'){s.status='paused';s.updatedAt=now(state);}}
  return {create,learner,facts,plan,selectScenario,start,startItem,activeSession,answer,next,continueRun,pause,qById,contentById,now,copy};
});
