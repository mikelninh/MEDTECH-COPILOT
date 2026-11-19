/* GitLaw × Medtech source recommender.
 * Explainable, deterministic lexical routing, not a generative model.
 * One selected source per question, no silent cross-document mixing.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.MedtechSourceRouter=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const normalize=x=>String(x||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").trim();
 const RULES={
  mpbetreibv:[
   [/mpbetreibv|betreiberverordnung/,12,"Medizinprodukte-Betreiberverordnung"],
   [/medizinproduktebuch|bestandsverzeichnis/,10,"Dokumentationspflichten beim Betrieb"],
   [/sicherheitstechnisch\w* kontrol|messtechnisch\w* kontrol|\bstk\b|\bmtk\b/,10,"Sicherheits- und messtechnische Kontrollen"],
   [/einweisung.{0,25}(?:medizinprodukt|gerat)|(?:medizinprodukt|gerat).{0,25}einweisung/,6,"Einweisung beim Betreiben"],
   [/betreiberpflicht|betreib\w* medizinprodukt/,7,"Pflichten beim Betreiben"]
  ],
  mpdg:[
   [/\bmpdg\b|medizinprodukterecht durchfuhrungsgesetz|medizinprodukterecht/,12,"Medizinprodukterecht"],
   [/marktuberwach|marktzulass|inverkehrbring/,9,"Marktüberwachung und Bereitstellung"],
   [/konformitatserklarung|ce kennzeich|benannte stelle/,9,"Konformität und Benannte Stellen"],
   [/vigilanz/,7,"Marktüberwachung und Vigilanz"]
  ],
  mpamiv:[
   [/\bmpamiv\b|medizinprodukte anwendermelde/,12,"Medizinprodukte-Anwendermelde- und Informationsverordnung"],
   [/vorkommnis\w*.{0,32}(?:meld|anzeig)|(?:meld|anzeig)\w*.{0,32}vorkommnis/,10,"Meldung von Medizinprodukte-Vorkommnissen"],
   [/mutmasslich\w* schwerwiegend\w* vorkommnis/,10,"Begriffsbestimmung für Vorkommnisse"]
  ],
  arbschg:[
   [/\barbschg\b|arbeitsschutzgesetz/,12,"Arbeitsschutzgesetz"],
   [/gefahrdungsbeurteilung|gefahrdung\w* beurteil/,11,"Gefährdungsbeurteilung"],
   [/unterweisung\w*|arbeitsschutz\w*|arbeitgeberpflicht\w*/,8,"Arbeitsschutz und Unterweisung"],
   [/arbeitsplatz\w*.{0,30}(?:gefahr|sicherheit|gesundheit)/,7,"Arbeitsplatzsicherheit"],
   [/\barbeitgeber\b/,2,"Arbeitgeber"]
  ],
  orion:[
   [/\borion\b|\bm100\b/,14,"Fiktiver ORION M100"],
   [/\bekg\b.{0,30}rausch|signalrausch/,8,"EKG-Signalrauschen im Trainingshandbuch"],
   [/\bspo2\b.{0,30}(?:signal|messung)/,6,"SpO₂-Signal im Trainingshandbuch"]
  ],
  lumen:[
   [/\blumen\b|\bp200\b/,14,"LUMEN-P200-Trainingsgerät"],
   [/fiktiv\w*|trainingshandbuch|ubungs\w* pumpe/,7,"Training statt realer Geräteanweisung"],
   [/verschlus\w* alarm.*(?:pumpe|demo)|(?:demo|pumpe).*verschlus\w* alarm/,6,"Fiktiver Verschlussalarm"],
   [/service ticket|serviceauftrag\w*/,4,"Service-Dokumentation"]
  ]
 };
 function route(question,sources){
  const q=normalize(question);
  const valid=Array.isArray(sources)?sources:[];
  if(!q||q.length>400)return {status:"unmatched",reason:"Bitte eine konkrete, kurze Frage stellen.",ranked:[]};
  const ranked=valid.map(src=>{
   const rules=RULES[src.id]||[],matched=rules.filter(([rx])=>rx.test(q));
   const score=matched.reduce((sum,item)=>sum+item[1],0);
   return {id:src.id,title:src.title,score,reason:matched.map(x=>x[2]).join(" · ")};
  }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const best=ranked[0],second=ranked[1];
  if(!best||best.score<6)return {status:"unmatched",reason:"Keine eindeutige Quelle erkannt. Bitte ein Buch auswählen oder Modell/Gesetz genauer nennen.",ranked};
  if(second&&second.score>0&&best.score-second.score<4){
   return {status:"ambiguous",reason:"Mehrere Quellen passen ähnlich gut. Bitte eine auswählen.",ranked};
  }
  return {status:"selected",id:best.id,reason:best.reason,confidence:best.score>10?"hoch":"mittel",ranked};
 }
 return {route,normalize};
});