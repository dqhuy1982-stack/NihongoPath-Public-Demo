/* Shared, bounded vector-writing contract. Self practice never establishes correctness. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NPKanaModel=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const H='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
 const K='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
 const allowed=char=>typeof char==='string'&&char.length===1&&(H.includes(char)||K.includes(char));
 function check(ok,message){if(!ok)throw Object.assign(new Error(message),{status:400});}
 function drawing(value){
  check(Array.isArray(value)&&value.length<=32,'Bản viết có quá nhiều nét.');
  return value.map(stroke=>{
   check(Array.isArray(stroke)&&stroke.length>=1&&stroke.length<=256,'Dữ liệu nét viết chưa hợp lệ.');
   return stroke.map(point=>{check(Array.isArray(point)&&point.length===2&&point.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1),'Điểm viết nằm ngoài bảng.');return point.map(n=>Math.round(n*10000)/10000);});
  });
 }
 function hasWriting(strokes){return strokes.some(stroke=>stroke.length>1&&stroke.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-stroke[i][0],p[1]-stroke[i][1]),0)>=.025);}
 function defaults(){return {schemaVersion:1,selected:'あ',script:'hiragana',speed:1};}
 function apply(state,body){
  check(['select','speed','draft','confirm'].includes(body.action),'Thao tác luyện viết chưa hỗ trợ.');
  let strokes;
  if(body.action==='speed'){check([.5,1,1.5].includes(body.speed),'Tốc độ chưa hợp lệ.');state.speed=body.speed;}
  else{check(allowed(body.char),'Chữ Kana chưa được hỗ trợ.');
   if(body.action==='select'){state.selected=body.char;state.script=H.includes(body.char)?'hiragana':'katakana';}
   else{strokes=drawing(body.strokes);if(body.action==='confirm')check(hasWriting(strokes),'Hãy tự viết trên bảng trước khi xác nhận.');}
  }
  return {state,strokes};
 }
 return {H,K,allowed,drawing,hasWriting,defaults,apply};
});
