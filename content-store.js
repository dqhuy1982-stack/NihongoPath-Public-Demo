/* Authoring workspace adapter; no learner data or credentials are stored here. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./content-model.js'):root.NPContentModel);if(typeof module==='object'&&module.exports)module.exports=api;else root.NPContentStore=api;})(typeof window==='undefined'?globalThis:window,function(M){
  'use strict';
  const KEY='nihongo-content-workspace-v1';
  function read(storage,base,seeds=[]){const raw=storage.getItem(KEY);if(raw===null)return M.create(base,seeds);let state;try{state=JSON.parse(raw);}catch{throw new Error('Chưa đọc được xưởng nội dung. Xuất bản lưu trước khi kiểm tra; chưa ghi đè dữ liệu.');}const shape=c=>M.canEdit(c);if(state?.schemaVersion!==1||!Number.isInteger(state.revision)||!Array.isArray(state.drafts)||!Array.isArray(state.releases)||!Array.isArray(state.events)||!Number.isInteger(state.sequence)||state.revision<0||state.sequence<0||state.drafts.some(d=>!d||typeof d.id!=='string'||!shape(d.content)||!Number.isInteger(d.revision)||!['draft','published'].includes(d.status)||!d.review)||state.releases.some(r=>!shape(r?.content)))throw new Error('Cấu trúc bản lưu nội dung chưa hợp lệ. Chưa ghi đè dữ liệu.');return state;}
  function write(storage,base,seeds,revision,mutate){const state=read(storage,base,seeds);if(state.revision!==revision)throw new Error('Xưởng nội dung vừa thay đổi ở cửa sổ khác. Tải lại bản mới trước khi tiếp tục.');const result=mutate(state);state.revision++;storage.setItem(KEY,JSON.stringify(state));return{state,result};}
  return{KEY,read,write};
});
