'use strict';
const Locale=(()=>{
 const key='nihongo-path-ui-locale',codes=['vi','en','ja'];let current='vi';try{const x=localStorage.getItem(key);if(codes.includes(x))current=x;}catch{}
 const clean=x=>String(x).normalize('NFC').trim().replace(/\s+/g,' '),lookup=new Map(NP_LOCALE_ROWS.map(r=>[clean(r[0]),r]));
 const nodeSources=new WeakMap(),attributeSources=new WeakMap();let titleSource='',lastTitle='';
 const format=[
  [/^([\u3040-\u30ff\s]+) · (.+)$/,m=>`${m[1]} · ${t(m[2])}`,m=>`${m[1]} · ${t(m[2])}`],
  [/^(\d+) màn hình \/ nhóm cấu hình chính · (\d+) hồ sơ nhân vật nháp$/,m=>`${m[1]} main screens / settings groups · ${m[2]} draft characters`,m=>`主な画面・設定項目 ${m[1]}件 · 人物設定案 ${m[2]}件`],
  [/^(.+?) · (\d+) phút$/,m=>`${t(m[1])} · ${m[2]} min`,m=>`${t(m[1])} · ${m[2]}分`],
  [/^(Bước|Câu|Thẻ) (\d+) \/ (\d+)$/,m=>`${({Bước:'Step',Câu:'Question',Thẻ:'Card'})[m[1]]} ${m[2]} / ${m[3]}`,m=>`${({Bước:'ステップ',Câu:'問題',Thẻ:'カード'})[m[1]]} ${m[2]} / ${m[3]}`],
  [/^Lộ trình (N[1-5])$/,m=>`${m[1]} learning path`,m=>`${m[1]}の学習プラン`],
  [/^Sổ học tập của (.+)$/,m=>`${m[1]}’s journal`,m=>`${m[1]}さんの学習ノート`],
  [/^Dữ liệu của (.+) trong bản thử trên trình duyệt này\.$/,m=>`${m[1]}’s demo data in this browser.`,m=>`このブラウザーに保存された${m[1]}さんの体験データです。`],
  [/^Hồ sơ cá nhân · Mục tiêu (.+)$/,m=>`Personal profile · Goal: ${t(m[1])}`,m=>`個人プロフィール · 目標：${t(m[1])}`],
  [/^Áp dụng cho (.+) · lưu trên trình duyệt này$/,m=>`For ${m[1]} · Saved in this browser`,m=>`${m[1]}さんの設定 · このブラウザーに保存`],
  [/^(\d+) lượt lưu$/,m=>`${m[1]} saved sessions`,m=>`${m[1]}回の保存`],
  [/^(\d+) lượt tự đánh giá$/,m=>`${m[1]} self-ratings`,m=>`${m[1]}回の自己評価`],
  [/^(\d+) lượt kiểm tra mẫu, không đủ để kết luận trình độ\.$/,m=>`${m[1]} sample attempts; not enough to establish proficiency.`,m=>`サンプルテスト${m[1]}回。レベルを判断するには不十分です。`],
  [/^(\d+) phút mỗi buổi$/,m=>`${m[1]} min per session`,m=>`1回${m[1]}分`],
  [/^(.+?) · (\d+) phút mỗi buổi$/,m=>`${t(m[1])} · ${m[2]} min per session`,m=>`${t(m[1])} · 1回${m[2]}分`],
  [/^(\d+) phút$/,m=>`${m[1]} min`,m=>`${m[1]}分`],
  [/^(\d+) phút · dự kiến$/,m=>`${m[1]} min · estimated`,m=>`目安 ${m[1]}分`],
  [/^Chào (.+),$/,m=>`Hello ${m[1]},`,m=>`${m[1]}さん、こんにちは。`],
  [/^Mục tiêu: (.+)$/,m=>`Goal: ${t(m[1])}`,m=>`目標：${t(m[1])}`],
  [/^Mục tiêu hiện tại: (.+)$/,m=>`Current goal: ${t(m[1])}`,m=>`現在の目標：${t(m[1])}`],
  [/^Mục tiêu: (.+) · (\d+) phút$/,m=>`Goal: ${t(m[1])} · ${m[2]} min`,m=>`目標：${t(m[1])} · ${m[2]}分`],
  [/^Mục tiêu (N[1-5]) của bạn được giữ nguyên\.$/,m=>`Your ${m[1]} goal is unchanged.`,m=>`目標の${m[1]}は変更されません。`],
  [/^(\d+) hồ sơ thử hiện tại · Có thể thêm người học$/,m=>`${m[1]} demo profiles · More learners welcome`,m=>`現在${m[1]}件のプロフィール · 学習者を追加できます`],
  [/^Tài khoản (.+)$/,m=>`Account: ${m[1]}`,m=>`アカウント：${m[1]}`],
  [/^Không gian của (.+)$/,m=>`${m[1]}’s space`,m=>`${m[1]}さんの学習スペース`],
  [/^(\d+) lượt kiểm tra thử đã ghi nhận\.$/,m=>`${m[1]} demo attempts recorded.`,m=>`体験中のテストを${m[1]}回記録しました。`],
  [/^Khóa (N[1-5])$/,m=>`${m[1]} course`,m=>`${m[1]}コース`],
  [/^BẢN REVIEW TƯƠNG TÁC · (\d+)$/,m=>`INTERACTIVE DESIGN REVIEW · ${m[1]}`,m=>`インタラクティブな試作版 · ${m[1]}`]
 ];
 function t(text){if(current==='vi')return text;const source=clean(text),row=lookup.get(source);if(row)return row[current==='en'?1:2];for(const [re,en,ja]of format){const m=source.match(re);if(m)return(current==='en'?en:ja)(m);}return text;}
 function preserveSpace(original,translated){if(original===translated)return original;return(original.match(/^\s*/)?.[0]||'')+translated+(original.match(/\s*$/)?.[0]||'');}
 function translate(root=document){
  const doc=root.ownerDocument||document;
  const walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while(n=walker.nextNode()){const p=n.parentElement;if(!p||p.closest('script,style,textarea,input,code,[data-no-translate],.jp'))continue;if(!clean(n.nodeValue))continue;let r=nodeSources.get(n);if(!r||n.nodeValue!==r.last)r={source:n.nodeValue,last:n.nodeValue};if(p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',r.source);r.last=preserveSpace(r.source,t(r.source));n.nodeValue=r.last;nodeSources.set(n,r);}
  const elements=root.querySelectorAll?root.querySelectorAll('[aria-label],[title],[placeholder],[alt]'):[];
  for(const el of elements){if(el.closest('[data-no-translate]'))continue;let records=attributeSources.get(el)||{};for(const a of ['aria-label','title','placeholder','alt']){if(!el.hasAttribute(a))continue;let v=el.getAttribute(a),r=records[a];if(!r||v!==r.last)r={source:v,last:v};r.last=t(r.source);el.setAttribute(a,r.last);records[a]=r;}attributeSources.set(el,records);}
  doc.documentElement.lang=current;
  for(const b of doc.querySelectorAll('[data-locale]'))b.setAttribute('aria-pressed',String(b.dataset.locale===current));
  for(const el of doc.querySelectorAll('.language-switch'))el.setAttribute('aria-label',t('Ngôn ngữ giao diện'));
  if(doc.title!==lastTitle)titleSource=doc.title;const titleBase=titleSource.replace(/ · Nihongo Path$/,'');lastTitle=t(titleBase)+' · Nihongo Path';doc.title=lastTitle;
 }
 function switcher(){return `<div class="language-switch" role="group" aria-label="Ngôn ngữ giao diện" data-no-translate>${[['vi','VI','Tiếng Việt'],['en','EN','English'],['ja','日本語','日本語']].map(([c,l,n])=>`<button type="button" data-locale="${c}" lang="${c}" aria-label="${n}" aria-pressed="${c===current}">${l}</button>`).join('')}</div>`;}
 function set(c){if(!codes.includes(c))return;current=c;try{localStorage.setItem(key,c);}catch{}translate(document);}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-locale]');if(b){set(b.dataset.locale);return;}queueMicrotask(()=>translate(document));});
 document.addEventListener('input',()=>queueMicrotask(()=>translate(document)));
 document.addEventListener('change',()=>queueMicrotask(()=>translate(document)));
 return{t,translate,switcher,set,get code(){return current;}};
})();
