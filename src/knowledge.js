/* MEDTECH COPILOT v0.2 — intentionally bounded, deterministic demonstration engine.
 * This is NOT an LLM, NOT production RAG, and NOT a hospital-authorised knowledge system.
 * No patient data or internal documents. Knowledge sources are public legal texts and fictional cases.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.MedtechKnowledge=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const LEGAL="https://www.gesetze-im-internet.de/mpbetreibv_2025/";
const sources=[
 {id:"LAW-07",title:"Instandhaltung",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 7",url:LEGAL+"__7.html",keywords:"instandhaltung wartung inspektion instandsetzung reparatur instandhalten",summary:"§ 7 regelt Anforderungen an die Instandhaltung von Medizinprodukten, darunter qualifiziertes Personal und Prüfungen nach Maßnahmen."},
 {id:"LAW-05",title:"Besondere Anforderungen",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 5",url:LEGAL+"__5.html",keywords:"befähigung qualifikation fachkenntnisse voraussetzungen wer darf berechtigt qualifiziert fachpersonal",summary:"§ 5 beschreibt Voraussetzungen für bestimmte Tätigkeiten an Medizinprodukten."},
 {id:"LAW-11",title:"Einweisung",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 11",url:LEGAL+"__11.html",keywords:"einweisung schulung benutzer anwender bedienen",summary:"§ 11 regelt besondere Anforderungen an die Einweisung für bestimmte Medizinprodukte."},
 {id:"LAW-12",title:"Sicherheitstechnische Kontrolle",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 12",url:LEGAL+"__12.html",keywords:"stk sicherheitstechnische kontrolle sicherheitskontrolle defibrillator intervall prüfung",summary:"§ 12 enthält Anforderungen an sicherheitstechnische Kontrollen für bestimmte Medizinprodukte."},
 {id:"LAW-15",title:"Messtechnische Kontrolle",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 15",url:LEGAL+"__15.html",keywords:"mtk messtechnische kontrolle messgenauigkeit kalibrierung messabweichung",summary:"§ 15 behandelt messtechnische Kontrollen und verweist auf Anlage 2."},
 {id:"LAW-13",title:"Bestandsverzeichnis und Medizinproduktebuch",type:"law",state:"VERIFIED_LINK",version:"MPBetreibV 2025",cite:"MPBetreibV § 13",url:LEGAL+"__13.html",keywords:"dokumentation medizinproduktebuch prüfbericht bestandsverzeichnis rückverfolgbarkeit",summary:"§ 13 enthält Vorgaben zum Medizinproduktebuch für bestimmte Produkte."},
 {id:"SIM-MON",title:"DEMO-MON-01 · Monitor-Signal",type:"simulation",state:"DEMO_APPROVED",version:"Fiktiv v2.0",cite:"Fiktiver Lernfall · Monitor",url:null,device:"DEMO-MON-01",keywords:"spo2 spO₂ monitor sensor signal artefakt alarm sauerstoffsättigung",summary:"Fiktiver Monitor: unplausibles Signal, Patientensicherheit und Fehleraufnahme statt Vermutungen."},
 {id:"SIM-PUMP",title:"DEMO-PUMP-02 · Alarmmeldung",type:"simulation",state:"DEMO_APPROVED",version:"Fiktiv v2.0",cite:"Fiktiver Lernfall · Pumpe",url:null,device:"DEMO-PUMP-02",keywords:"infusionspumpe pumpe okklusion verschlussalarm alarm schauch",summary:"Fiktiver Pumpenalarm: Behandlungsteam informieren, Fehler dokumentieren, keine Manipulation am Therapiesystem."},
 {id:"SIM-SERVICE",title:"DEMO-SRV-03 · Service-Ticket",type:"simulation",state:"DEMO_APPROVED",version:"Fiktiv v2.0",cite:"Fiktiver Lernfall · Dokumentation",url:null,keywords:"servicefall servicebericht ticket übergabe dokumentation wartungsbericht",summary:"Fiktiver Servicefall mit Quelle, Zuständigkeit, Bearbeitung und freigegebenem Ergebnis."},
 {id:"SIM-OLD",title:"DEMO-PUMP-02 · Alte Arbeitsanweisung",type:"simulation",state:"RETIRED",version:"Fiktiv v1.0",cite:"Archivierter Lernfall · nicht zur Nutzung",url:null,device:"DEMO-PUMP-02",keywords:"alte anweisung dokument",summary:"Absichtlich archivierte Fassung – muss von Antworten ausgeschlossen werden."}
];
const devices=[
 {id:"DEMO-MON-01",title:"Patientenmonitor",subtitle:"Simulierter Übungsdatensatz",icon:"monitor",model:"EX-MON 100",state:"Simulation",docIds:["SIM-MON","LAW-07"]},
 {id:"DEMO-PUMP-02",title:"Infusionspumpe",subtitle:"Simulierter Übungsdatensatz",icon:"pump",model:"EX-PUMP 200",state:"Simulation",docIds:["SIM-PUMP","LAW-07"]},
 {id:"DEMO-SRV-03",title:"Serviceauftrag",subtitle:"Simulierter Übungsdatensatz",icon:"ticket",model:"EX-SRV 300",state:"Simulation",docIds:["SIM-SERVICE","LAW-13"]}
];
const scenarios=[
 {id:"find",title:"01 · Finden statt suchen",tag:"WISSEN",device:"DEMO-MON-01",question:"Was ist eine STK?",description:"Stelle eine Fachfrage. Das System liefert die Rechtsgrundlage und macht sie mit einem Klick überprüfbar.",goal:"Quellenorientierung"},
 {id:"safe",title:"02 · Wissen, wann man stoppt",tag:"SICHERHEIT",device:"DEMO-PUMP-02",question:"Wie kann ich den Pumpenalarm umgehen?",description:"Ein riskanter Prompt muss in eine sichere Eskalation münden – ohne Reparatur- oder Therapieschritte.",goal:"Sicheres Nichtwissen"},
 {id:"version",title:"03 · Richtige Version finden",tag:"DOKUMENTE",device:"DEMO-PUMP-02",question:"Zeige die gültige Demo-Anweisung bei Pumpenalarm",description:"Ein archivierter Übungsstand wird als ungültig angezeigt und darf nicht in die Antwort gelangen.",goal:"Dokumenten-Governance"},
 {id:"unknown",title:"04 · Keine Gerätedaten erfinden",tag:"VERTRAUEN",device:"DEMO-MON-01",question:"Wann wurde unser Monitor zuletzt gewartet?",description:"Ohne echte Inventardaten muss der Assistent seine Grenze erklären.",goal:"Keine Halluzination"}
];
const workflows={
 "DEMO-MON-01":[
  {title:"Patientensituation klären",text:"Falls Patientinnen oder Patienten betroffen sind, übernimmt das klinisch zuständige Team die Beurteilung und die sichere Versorgung.",owner:"Klinisches Team"},
  {title:"Gerätedaten und Meldung erfassen",text:"Modell, Inventar-ID, Zeitpunkt, genaue Meldung und betroffenen Sensor ohne personenbezogene Daten dokumentieren.",owner:"Medizintechnik"},
  {title:"Freigegebene Unterlage finden",text:"Passendes Herstellerhandbuch und lokale SOP für genau dieses Modell und diesen Softwarestand prüfen.",owner:"Qualifiziertes Fachpersonal"},
  {title:"Prüfung und Freigabe",text:"Erforderliche Kontrollen und Rückgabe ausschließlich gemäß Zuständigkeit, Herstellervorgaben und Hausprozess.",owner:"Befugte Fachperson"}
 ],
 "DEMO-PUMP-02":[
  {title:"Versorgung hat Priorität",text:"Patientennahe Alarmmeldungen gehören unmittelbar an das behandelnde Team. Keine eigenmächtigen Eingriffe in eine laufende Infusion.",owner:"Klinisches Team"},
  {title:"Störung dokumentieren",text:"Modell, Inventar-ID und genaue Alarmmeldung aufnehmen, ohne vertrauliche Therapie- oder Patientendaten in den Prototyp zu schreiben.",owner:"Medizintechnik"},
  {title:"Gültige Unterlage prüfen",text:"Nur freigegebene, modell- und versionsspezifische Herstellerunterlagen und lokale SOP heranziehen. Archivierte Fassungen ignorieren.",owner:"Qualifiziertes Fachpersonal"},
  {title:"Abschluss nur durch Befugte",text:"Erforderliche Sicherheits- und Funktionsprüfungen sowie dokumentierte Freigabe liegen beim zuständigen Personal.",owner:"Befugte Fachperson"}
 ],
 "DEMO-SRV-03":[
  {title:"Anliegen präzisieren",text:"Geräte-ID, Problembeschreibung und Dringlichkeit ohne Patienteninformationen erfassen.",owner:"Serviceannahme"},
  {title:"Zuständigkeit bestimmen",text:"Interne Betreuung oder Hersteller-Service nach Geräteklasse und Qualifikation abgleichen.",owner:"Teamleitung"},
  {title:"Ergebnis dokumentieren",text:"Befund, Maßnahme, Bearbeitende, Prüfungen und Status im autorisierten System festhalten.",owner:"Medizintechnik"},
  {title:"Freigabe nachvollziehen",text:"Rückgabe nur nach erforderlicher Kontrolle und dokumentierter Zuständigkeit.",owner:"Befugte Fachperson"}
 ]
};
const norm=x=>String(x||"").toLocaleLowerCase("de-DE").replace(/ß/g,"ss").replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/[^a-z0-9]+/g," ").trim();
const rules=[
 {rx:/\bstk\b|sicherheitstechnisch/,id:"LAW-12",title:"Sicherheitstechnische Kontrolle (STK)",answer:"§ 12 MPBetreibV regelt STK für bestimmte Medizinprodukte nach Anlage 1. Für die konkrete Prüfpflicht und Frist zählen Gerätetyp und rechtliche Voraussetzungen. Bitte die aktuelle Normstelle prüfen."},
 {rx:/\bmtk\b|messtechnisch|kalibrierung/,id:"LAW-15",title:"Messtechnische Kontrolle (MTK)",answer:"§ 15 MPBetreibV regelt die MTK. Betroffene Produktarten und Fristen stehen in Anlage 2. Eine allgemeine Geräteprüfung ersetzt eine erforderliche MTK nicht."},
 {rx:/\beinweis|schulung|bedienberechtig/,id:"LAW-11",title:"Einweisung und Befähigung",answer:"§ 11 MPBetreibV enthält besondere Regeln zur Einweisung für bestimmte Produkte. Diese Demo und ein Voice-Guide sind kein Ersatz für eine erforderliche Einweisung."},
 {rx:/dokumentier|medizinproduktebuch|bestandsverzeichnis/,id:"LAW-13",title:"Nachvollziehbar dokumentieren",answer:"Im Kontext bestimmter Medizinprodukte ist das Medizinproduktebuch nach § 13 MPBetreibV relevant. Konkrete Dokumentationspflichten und Prozessfelder müssen anhand des Produktes und der lokalen Vorgaben geprüft werden."},
 {rx:/wer darf|qualifik|befaehig|befugnis|fachkenntnis/,id:"LAW-05",title:"Qualifiziertes Personal",answer:"§ 5 MPBetreibV nennt besondere fachliche Anforderungen für bestimmte Tätigkeiten. Ein Chatbot kann die notwendigen Qualifikationen und Berechtigungen nicht ersetzen."},
 {rx:/instandhalt|instandsetz|wartung|inspektion|reparier/,id:"LAW-07",title:"Instandhaltung im Krankenhaus",answer:"§ 7 MPBetreibV behandelt Instandhaltung, darunter Wartung, Inspektion und Instandsetzung. Nach entsprechenden Maßnahmen können Prüfungen sicherheits- und funktionsrelevanter Merkmale erforderlich sein."},
 {rx:/\bspo2\b|sauerstoffsaettigung|monitor|artefakt|sensorsignal/,id:"SIM-MON",title:"Monitor: sichere Fehleraufnahme",answer:"Im fiktiven Monitorfall wird zunächst die Patientensicherheit mit dem Behandlungsteam geklärt. Anschließend werden Gerät, Sensor, Meldung und freigegebene Quellen erfasst. Ohne konkretes Handbuch gibt es keine Reparaturanleitung."},
 {rx:/infusionspumpe|\bpumpe\b|pumpenalarm|verschlussalarm|okklusion/,id:"SIM-PUMP",title:"Pumpenalarm: sichere Eskalation",answer:"Im fiktiven Pumpenfall hat die Versorgung durch das klinische Team Vorrang. Der technische Service erfasst den Alarm und sucht die passende, gültige Herstelleranweisung. Keine Manipulation am aktiven Therapiesystem."},
 {rx:/servicefall|servicebericht|serviceauftrag|\bticket\b/,id:"SIM-SERVICE",title:"Service-Ticket nachvollziehbar",answer:"Ein fiktives Service-Ticket dokumentiert Geräte-ID, Meldung, Befund, Maßnahme, verantwortliche Person und Freigabestatus. Reale Pflichtfelder ergeben sich aus dem Krankenhausprozess."}
];
const dangerous=/((umgeh|deaktiv|abschalt|ausschalt|entfern|ueberbrueck|manipulier|aushebel).{0,65}(alarm|schutzleiter|sicherheit|sperre|verriegelung|pruefung)|(?:alarm|schutzleiter|sicherheit|sperre|verriegelung).{0,65}(umgeh|deaktiv|abschalt|ausschalt|entfern|ueberbrueck|manipulier|aushebel)|ohne.{0,50}(pruefung|kontrolle).{0,30}(freigeb|inbetrieb|frei\b)|\b(dosis|dosierung|therapieentscheidung|patientendaten|passwort)\b)/;
const assetFacts=/(unser|unsere|unserem|unserer|zuletzt|aktueller softwarestand|welcher softwarestand|wann wurde|seriennummer|inventarnummer|realen bestand)/;
const numericFacts=/(welche|wieviel|wie viel|wie viele).{0,38}(volt|spannung|ampere|joule|grenzwert|dosis|milligramm)/;
function answer(question,deviceId){
  const q=norm(question);
  if(!q)return {kind:"unknown",title:"Bitte Frage eingeben",text:"Ich kann nur Fragen beantworten, zu denen freigegebene Demoquellen vorhanden sind.",sources:[],deviceId:deviceId||null};
  if(dangerous.test(q))return {kind:"blocked",title:"Sicherheitsgrenze erreicht",text:"Ich kann keine Anweisung zur Umgehung von Alarmen, Schutzfunktionen, Prüfungen oder zu klinischen Therapieentscheidungen geben. Betroffene Geräte und Versorgung müssen von den zuständigen Fachpersonen beurteilt werden.",sources:[],deviceId:deviceId||null};
  if(assetFacts.test(q)||numericFacts.test(q))return {kind:"unknown",title:"Keine verifizierten Gerätedaten",text:"Diese öffentliche Demo hat keinen Zugriff auf echte Gerätebestände, Servicehistorien, Messwerte oder Modell-Spezifikationen. Ich erfinde keine Gerätefakten. Bitte das freigegebene Inventarsystem und die gültige Herstellerunterlage heranziehen.",sources:[],deviceId:deviceId||null};
  if(/(gueltig|aktuell|version|anweisung)/.test(q)&&/(pumpe|pumpenalarm)/.test(q)){
    const d=sources.find(x=>x.id==="SIM-PUMP");return {kind:"sourced",title:"Aktive Demo-Fassung gefunden",text:"Für den fiktiven Pumpenfall ist nur die Lernkarte v2.0 als aktive Demoquelle markiert. Die Fassung v1.0 ist archiviert und ausdrücklich nicht für Antworten zugelassen. Das ist eine Versionssimulation, keine reale SOP.",sources:[d],deviceId:"DEMO-PUMP-02"};
  }
  const rule=rules.find(r=>r.rx.test(q));
  if(rule){
    const source=sources.find(s=>s.id===rule.id);
    return {kind:"sourced",title:rule.title,text:rule.answer,sources:[source],deviceId:deviceId||source.device||null};
  }
  return {kind:"unknown",title:"Keine ausreichend passende Quelle",text:"Im kuratierten Demo-Wissensbestand finde ich keine belastbare Fundstelle für diese Frage. Bitte Herstellerunterlagen oder die zuständige Fachperson heranziehen. Ich rate hier nicht.",sources:[],deviceId:deviceId||null};
}
const availableSources=()=>sources.filter(s=>s.state!=="RETIRED");
function sourceFor(id){return sources.find(s=>s.id===id)||null}
function activeByDevice(id){return availableSources().filter(s=>!s.device||s.device===id)}
return {sources,devices,scenarios,workflows,answer,availableSources,sourceFor,norm};
});
