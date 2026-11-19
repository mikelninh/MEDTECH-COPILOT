/* MEDTECH COPILOT V1.2 — purely geometric highlighting of verified text
 * in the selected original PDF page. No OCR and no generated citations.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.MedtechEvidenceHighlight=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const normalize=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
 function indices(items,evidence){
  const text=evidence?.excerpt||"";
  const terms=(evidence?.matchedTerms||[]).map(normalize).filter(x=>x.length>=4);
  const joined=[];const owners=[];
  items.forEach((item,index)=>{
   if(typeof item.str!=="string"||!item.str.trim())return;
   const part=normalize(item.str);if(!part)return;
   if(joined.length){joined.push(" ");owners.push(index)}
   for(const ch of part){joined.push(ch);owners.push(index)}
  });
  const source=joined.join("");
  const excerpt=normalize(text);
  const words=excerpt.split(" ").filter(Boolean);
  let at=-1,len=0;
  for(let count=Math.min(10,words.length);count>=2;count--){
   for(let offset=0;offset<=Math.min(12,words.length-count);offset++){
    const phrase=words.slice(offset,offset+count).join(" ");
    if(phrase.length<12)continue;
    at=source.indexOf(phrase);
    if(at>=0){len=phrase.length;break}
   }
   if(at>=0)break;
  }
  if(at>=0){
   const selected=new Set(owners.slice(at,at+len));
   return [...selected].filter(i=>Number.isInteger(i)).slice(0,16);
  }
  const out=[];
  for(let i=0;i<items.length;i++){
   const str=normalize(items[i].str);
   if(str&&terms.some(term=>str.includes(term)||term.includes(str)&&str.length>=6)){
    out.push(i);if(out.length>=12)break;
   }
  }
  return out;
 }
 function rectangles(items,viewport,evidence){
  if(!items?.length||!viewport||!evidence?.excerpt)return [];
  const list=indices(items,evidence),out=[];
  for(const index of list){
   const item=items[index];
   if(!Array.isArray(item.transform)||item.transform.length<6)continue;
   const point=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);
   const height=Math.max(7,Math.abs(item.transform[3]||item.height||9)*viewport.scale);
   const width=Math.max(9,Math.abs(item.width||1)*viewport.scale);
   const x=Math.max(0,point[0]-2),y=Math.max(0,point[1]-height*1.05);
   if(!Number.isFinite(x+y+height+width)||x>viewport.width||y>viewport.height)continue;
   out.push({x,y,width:Math.min(width+4,viewport.width-x),height:Math.min(height*1.27,viewport.height-y)});
  }
  return out;
 }
 return {normalize,indices,rectangles};
});
