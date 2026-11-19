#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const H=require("../src/evidence_highlight.js");
const viewport={width:600,height:800,scale:1,convertToViewportPoint:(x,y)=>[x,800-y]};
const lines=[
 {str:"Das Medizinproduktebuch",transform:[12,0,0,12,50,650],height:12,width:156},
 {str:"ist für Geräte der Anlage 1",transform:[12,0,0,12,50,620],height:12,width:201},
 {str:"und Anlage 2 zu führen.",transform:[12,0,0,12,50,590],height:12,width:176},
 {str:"Sonstige Angaben",transform:[12,0,0,12,50,555],height:12,width:100}
];
const evidence={excerpt:"Das Medizinproduktebuch ist für Geräte der Anlage 1 und Anlage 2 zu führen.",matchedTerms:["Medizinproduktebuch","Anlage"]};
const selected=H.indices(lines,evidence);
assert.deepEqual(selected.slice(0,3),[0,1,2]);
assert.ok(!selected.includes(3),"Unrelated text should not be highlighted");
const rects=H.rectangles(lines,viewport,evidence);
assert.equal(rects.length,3);
assert.ok(rects.every(r=>r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.y<800));
assert.deepEqual(H.rectangles(lines,viewport,{excerpt:""}),[]);
const fallback=H.rectangles(lines,viewport,{excerpt:"Nicht passende Formulierung",matchedTerms:["Medizinproduktebuch"]});
assert.equal(fallback.length,1);
console.log("PASS V1.2: source-matched highlighted original text geometry, nonmatches excluded, empty-safe");
