/* Reusable preference fields. Safe to render before app.js has initialized. */
window.NPStudyPreferences=(function(){
  const tr=(vi,en,ja)=>[vi,en,ja][{vi:0,en:1,ja:2}[Locale.code]||0];
  function label(mode){return {
    adaptive:tr('Linh hoạt · đề xuất','Adaptive · recommended','状況に合わせる・おすすめ'),
    resume:tr('Học tiếp trước','Continue first','続きの学習を優先'),
    review:tr('Ôn trước','Review first','復習を優先')
  }[NPAdvicePolicy.normalize(mode)];}
  function fields(mode){
    const descriptions={
      adaptive:tr('Giữ mạch bài đang dở; ôn ngắn trước khi lỗi lặp lại ảnh hưởng trực tiếp đến bài đó.','Continue your lesson; review briefly first when repeated errors directly affect it.','途中の学習を基本に、関連するつまずきが続くときは短く復習します。'),
      resume:tr('Ưu tiên phần đang dở, rồi dành thời gian còn lại cho ôn tập.','Continue unfinished work, then use remaining time for review.','途中の学習を先に行い、残りの時間で復習します。'),
      review:tr('Ôn một lượng vừa sức từ các mục cần ôn, rồi trở lại bài học.','Start with a manageable selection of review items, then return to the lesson.','必要な復習を無理のない量だけ行ってから、教材に戻ります。')
    };
    return `<fieldset class="priority-picker"><legend>${tr('Trợ lí nên ưu tiên thế nào?','How should your guide prioritize?','学習ガイドの優先方針')}</legend>${NPAdvicePolicy.MODES.map(value=>`<label class="priority-choice"><input type="radio" name="studyPriority" value="${value}" ${NPAdvicePolicy.normalize(mode)===value?'checked':''}><span><strong>${label(value)}</strong><small>${descriptions[value]}</small></span></label>`).join('')}<p class="form-help">${tr('Lưu riêng theo hồ sơ. Khi quay lại sau thời gian nghỉ, cả ba chế độ đều đề nghị một phiên nhẹ; bạn vẫn chọn được việc muốn học.','Saved per learner. After a break, all modes offer a gentle return; you can still choose your activity.','プロフィール別に保存します。休んだ後はどの方針でも短い学習を提案します。学習内容は自分で選べます。')}</p></fieldset>`;
  }
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-locale]'))return;
    queueMicrotask(()=>{
      if(route()==='today'){render(false);document.querySelector(`.topbar [data-locale="${Locale.code}"]`)?.focus({preventScroll:true});return;}
      document.querySelectorAll('.priority-picker').forEach(picker=>{
        const mode=picker.querySelector('input:checked')?.value;
        const template=document.createElement('template');template.innerHTML=fields(mode);picker.replaceWith(template.content.firstElementChild);
      });
    });
  });
  return {fields,label};
})();
