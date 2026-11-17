/* Original outline iconography and ergonomic shortcuts; no external assets. */
(function(){
"use strict";
const shapes={
 overview:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 device:'<rect x="7" y="2" width="10" height="20" rx="2.3"/><path d="M11 18h2"/>',
 library:'<path d="M5 3h11l3 3v15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M16 3v4h4M7 11h10M7 15h10"/>',
 sparkle:'<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/><path d="M19 18v4M17 20h4"/>',
 glasses:'<path d="M2 9c0-2 1-3 3-3h5c2 0 3 1 3 3v5c0 2-1 3-3 3H6c-2 0-4-2-4-4V9zM13 9c0-2 1-3 3-3h3c2 0 3 1 3 3v4c0 2-2 4-4 4h-2c-2 0-3-1-3-3V9z"/><path d="M10 10h4"/>',
 waveform:'<path d="M3 12h2m2 0V8m0 4v4m4-10v12m4-8v4m4-2h2"/>'
};
function svg(type){
  const wrap=document.createElementNS("http://www.w3.org/2000/svg","svg");
  wrap.setAttribute("viewBox","0 0 24 24");
  wrap.setAttribute("fill","none");wrap.setAttribute("stroke","currentColor");
  wrap.setAttribute("stroke-linecap","round");wrap.setAttribute("stroke-linejoin","round");
  wrap.setAttribute("stroke-width","1.85");wrap.setAttribute("aria-hidden","true");
  wrap.classList.add("ui-icon");
  wrap.innerHTML=shapes[type]||shapes.sparkle;
  return wrap;
}
function addIcon(button,type,selector){
  const target=button.querySelector(selector);
  if(!target)return;
  target.textContent="";
  target.append(svg(type));
}
function enhance(){
  const menu={home:"overview",ask:"search",field:"device",library:"library",lab:"sparkle"};
  document.querySelectorAll(".nav button[data-screen]").forEach(b=>addIcon(b,menu[b.dataset.screen],".nav-icon"));
  document.querySelectorAll(".bottom-nav button[data-screen]").forEach(b=>addIcon(b,menu[b.dataset.screen],"span"));
  document.querySelectorAll(".mode-card").forEach((b,i)=>addIcon(b,["search","device","glasses"][i]||"sparkle",".mode-symbol"));
  const trigger=document.getElementById("spotlightTrigger");
  const ask=document.getElementById("askInput");
  if(trigger&&ask){
    const open=()=>{
      const screen=document.querySelector('button.nav-item[data-screen="ask"]');
      if(screen){screen.click();requestAnimationFrame(()=>ask.focus())}
    };
    trigger.addEventListener("click",open);
    window.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();return}
      if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&
        !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)&&
        !document.querySelector("dialog[open]")){e.preventDefault();open()}
      if(e.key==="Escape"&&document.activeElement===ask)ask.blur();
    });
  }
  const privacy=document.getElementById("privacyButton");
  if(privacy)privacy.setAttribute("title","Datenschutz und Sicherheitsgrenzen ansehen");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",enhance,{once:true});else enhance();
})();
