/* Per-learner browser repository. Replace this boundary with an API later. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./lesson-engine.js'):root.NPLessonEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.NPLessonStore=api;})(typeof window==='undefined'?globalThis:window,function(E){
  'use strict';
  const PREFIX='nihongo-learning-v1:';
  function read(storage,id){
    const raw=storage.getItem(PREFIX+id);
    if(raw===null)return E.create(id);
    let s;try{s=JSON.parse(raw);}catch{throw new Error('Dữ liệu phiên học chưa đọc được. Hãy xuất bản lưu để kiểm tra; chưa ghi đè dữ liệu.');}
    if(s?.schemaVersion!==1||s.learnerId!==id||!Number.isInteger(s.revision)||!Array.isArray(s.sessions)||!Array.isArray(s.attempts)||!Array.isArray(s.reviews)||s.sessions.some(x=>x.learnerId!==id)||s.attempts.some(x=>x.learnerId!==id)||s.reviews.some(x=>x.learnerId!==id))throw new Error('Bản lưu không đúng cấu trúc của hồ sơ này. Chưa ghi đè dữ liệu.');
    return s;
  }
  function write(storage,id,revision,mutate){
    const state=read(storage,id);
    if(state.revision!==revision)throw new Error('Phiên này vừa thay đổi ở cửa sổ khác. Đã tải lại bản mới; hãy tiếp tục.');
    const result=mutate(state);state.revision++;
    storage.setItem(PREFIX+id,JSON.stringify(state));
    return {state,result};
  }
  return {PREFIX,read,write};
});
