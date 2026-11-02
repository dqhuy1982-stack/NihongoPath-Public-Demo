/* Version lookup is shared by the authoring workspace and learner player. */
(function(){
  'use strict';
  const base=NP_LESSON_CONTENT,seeds=NP_AUTHORING_SEED.drafts;
  const read=()=>NPContentStore.read(localStorage,base,seeds);
  window.NPContentCatalog={base,seeds,read,
    get(id=base.id,version){try{return NPContentModel.get(read(),base,id,version);}catch{return id===base.id&&(!version||Number(version)===base.version)?NPContentModel.copy(base):null;}},
    list(){try{return NPContentModel.catalog(read(),base);}catch{return[NPContentModel.copy(base)];}},
    draft(id){try{return NPContentModel.copy(read().drafts.find(d=>d.id===id)||null);}catch{return null;}},
    reviewContent(learning,options){let state;try{state=read();}catch{state=NPContentModel.create(base);}return NPContentModel.reviewContent(state,base,learning,options);}
  };
})();
