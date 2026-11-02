/* Question interactions keep their DOM and viewport; learning data remains server-owned. */
(function(){
  'use strict';
  const E=window.NPLessonEngine;
  let dock=null;
  const stage=()=>document.querySelector('.n5-stage[data-question="true"]');
  function capture(){const el=stage();return {x:scrollX,y:scrollY,key:el?el.dataset.session+'/'+el.dataset.unit:null};}
  function restore(view){const el=stage();if(view?.key&&el&&view.key===el.dataset.session+'/'+el.dataset.unit)window.scrollTo({left:view.x,top:view.y,behavior:'instant'});}
  function reserveBoard(el){
    const board=el.querySelector('.n5-order');if(!board)return;
    const tray=board.querySelector('.n5-answer-tray'),pool=board.querySelector('.n5-token-pool');
    const width=board.getBoundingClientRect().width,key=Math.round(width)+':'+getComputedStyle(el).getPropertyValue('--jp-size');
    if(board.dataset.reserved===key)return;
    const tokens=[...board.querySelectorAll('[data-token]')];
    for(const region of [tray,pool]){
      const probe=region.cloneNode(false);probe.removeAttribute('aria-label');probe.removeAttribute('role');
      Object.assign(probe.style,{position:'fixed',left:'-10000px',top:'0',width:region.getBoundingClientRect().width+'px',height:'auto',minHeight:'0',visibility:'hidden',pointerEvents:'none',margin:'0'});
      probe.setAttribute('aria-hidden','true');for(const token of tokens)probe.append(token.cloneNode(true));
      board.append(probe);region.style.minHeight=Math.ceil(Math.max(region===tray?85:70,probe.getBoundingClientRect().height))+'px';probe.remove();
    }
    board.dataset.reserved=key;
  }
  function syncDock(){
    const el=stage(),narrow=matchMedia('(max-width:767px), (max-height:600px) and (pointer:coarse)').matches;
    document.body.classList.toggle('n5-question-active',!!el);
    document.body.classList.toggle('n5-question-docked',!!el&&narrow);
    if(!el||!narrow){dock?.remove();dock=null;return;}
    if(!dock){dock=document.createElement('section');dock.id='n5-question-dock';dock.className='n5-question-dock';dock.setAttribute('aria-label','Thao tác câu hỏi');document.body.append(dock);}
    const source=el.querySelector('.n5-step-actions'),hint=el.querySelector('[data-action="n5-hint"]');
    const html=(source?.innerHTML||'')+(hint?hint.outerHTML:'');
    if(dock.dataset.content!==html){dock.innerHTML=html;dock.dataset.content=html;}
    const nav=document.querySelector('.bottomnav');
    const navHeight=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().height:0;
    dock.style.bottom=navHeight+'px';
    document.documentElement.style.setProperty('--n5-dock-height',Math.ceil(dock.getBoundingClientRect().height)+'px');
  }
  function mount(){const el=stage();if(el)reserveBoard(el);syncDock();}
  function update(state,source){
    const el=stage(),s=E.active(state),u=E.unit(s);
    if(!el||!s||s.id!==el.dataset.session||u?.id!==el.dataset.unit||s.current.feedbackId)return false;
    const view=capture(),q=E.definition(s,u.questionId);
    if(q.type==='choice'){
      el.querySelectorAll('[data-action="n5-select"]').forEach(button=>{const selected=button.dataset.option===s.current.selected;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    }else{
      const tray=el.querySelector('.n5-answer-tray'),pool=el.querySelector('.n5-token-pool');
      const buttons=new Map([...el.querySelectorAll('[data-token]')].map(button=>[button.dataset.token,button]));
      let placeholder=tray.querySelector('.muted');if(!placeholder){placeholder=document.createElement('span');placeholder.className='muted';placeholder.textContent='Câu của bạn sẽ hiện ở đây.';tray.prepend(placeholder);}
      placeholder.hidden=s.current.order.length>0;
      for(const id of s.current.order){const button=buttons.get(id);if(!button)return false;button.setAttribute('aria-label','Bỏ mảnh '+q.tokens.find(t=>t.id===id).text);tray.append(button);}
      for(const id of u.optionOrder.filter(id=>!s.current.order.includes(id))){const button=buttons.get(id);if(!button)return false;button.setAttribute('aria-label','Thêm mảnh '+q.tokens.find(t=>t.id===id).text);pool.append(button);}
    }
    const check=el.querySelector('[data-action="n5-check"]');if(check)check.disabled=!E.canCheck(s);
    const root=document.querySelector('[data-n5-root]');if(root)root.dataset.revision=state.revision;
    syncDock();restore(view);window.NPLessonUI?.mount();
    if(source?.isConnected)source.focus({preventScroll:true});
    return true;
  }
  function reveal(target){
    if(!target)return;
    target.focus({preventScroll:true});
    const topbar=document.querySelector('.topbar'),reviewbar=document.querySelector('.reviewbar'),rect=target.getBoundingClientRect();
    const top=Math.max(12,topbar?.getBoundingClientRect().bottom||0,reviewbar?.getBoundingClientRect().bottom||0)+12;
    const bottom=dock?dock.getBoundingClientRect().top-12:innerHeight-16;
    if(rect.top<top||rect.top+Math.min(96,rect.height)>bottom)window.scrollBy({top:rect.top-top,left:0,behavior:'instant'});
  }
  function after(action,view,source){
    mount();
    if(['select','token'].includes(action))return;
    if(['hint','reading','check'].includes(action))restore(view);
    if(action==='check')reveal(document.querySelector('[data-n5-feedback]'));
    else if(action==='hint'){const hint=document.querySelector('.n5-hint');if(hint){hint.tabIndex=-1;reveal(hint);}}
    else if(['next','start','resume'].includes(action)){const heading=document.querySelector('.n5-stage h2');if(heading){heading.tabIndex=-1;reveal(heading);}}
    else if(source?.isConnected)source.focus({preventScroll:true});
  }
  window.NPLessonInteractions={capture,restore,mount,update,after};
  window.addEventListener('resize',mount);
  window.visualViewport?.addEventListener('resize',mount);
  document.fonts?.ready.then(mount);
})();
