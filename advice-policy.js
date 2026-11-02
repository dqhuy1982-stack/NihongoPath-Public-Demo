/* Shared priority policy. Modes express preference, never inferred proficiency. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.NPAdvicePolicy=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const MODES=['adaptive','resume','review'];
  const normalize=mode=>MODES.includes(mode)?mode:'adaptive';
  function choose(facts){
    const mode=normalize(facts.mode),rules=['priority-'+mode];
    const result=kind=>({kind,mode,rules});
    if(facts.gapDays>=4){rules.push('return-gently');return result('return');}
    if(facts.isNew){rules.push('new-learner');return result('new');}
    if(mode==='resume'&&facts.hasPending){rules.push('resume');return result('resume');}
    if(mode==='review'&&facts.dueCount>0){rules.push('due-review');return result('review');}
    if(mode==='adaptive'&&facts.hasPending){
      if(facts.blockingRepeated){rules.push('blocking-error','repeated-error');return result('repair');}
      if(facts.blockingSlow){rules.push('blocking-error','slow-recall');return result('recall');}
      rules.push('resume');return result('resume');
    }
    if(facts.hasRepeated){rules.push('repeated-error');return result('repair');}
    if(facts.hasSlow){rules.push('slow-recall');return result('recall');}
    if(facts.hasPending){rules.push('resume');return result('resume');}
    if(facts.dueCount>0){rules.push('due-review');return result('review');}
    return result('suggest');
  }
  return {MODES,normalize,choose};
});
