/* Bouton « Installer l'appli » (mobile, en bas). Android/Chrome : invite native ; iOS : mode d'emploi. */
(function(){
 var KEY='tk_pwa_dismiss',DAYS=14,deferred=null,bar=null,sheet=null;
 function get(){try{return localStorage.getItem(KEY);}catch(e){return null;}}
 function set(v){try{localStorage.setItem(KEY,v);}catch(e){}}
 function standalone(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;}
 function mobile(){return (window.matchMedia&&matchMedia('(pointer: coarse)').matches)&&Math.min(screen.width,innerWidth)<=900;}
 function ios(){var u=navigator.userAgent;return /iPad|iPhone|iPod/.test(u)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
 function dismissed(){var t=+get();return t&&Date.now()-t<DAYS*864e5;}
 function remove(){if(bar&&bar.parentNode){bar.parentNode.removeChild(bar);}bar=null;}
 function closeSheet(){if(sheet&&sheet.parentNode){sheet.parentNode.removeChild(sheet);}sheet=null;}
 function pos(){
  if(!bar){return;}
  var tb=document.querySelector('.tabbar'),h=0;
  if(tb&&tb.offsetParent!==null){h=tb.getBoundingClientRect().height;}
  bar.style.bottom='calc('+Math.round(h)+'px + env(safe-area-inset-bottom,0px) + 8px)';
  if(h){bar.style.bottom=Math.round(h+8)+'px';}
 }
 function showSheet(){
  if(sheet){return;}
  sheet=document.createElement('div');sheet.className='pwa-ov';
  sheet.innerHTML='<div class="pwa-sh" role="dialog" aria-label="Installer Trokémon"><div class="name">Installer Trokémon</div>'+
   '<ol><li>Touche le bouton <b>Partager</b> <span class="pwa-ic">⎙</span> de Safari (en bas de l\'écran).</li><li>Choisis <b>Sur l\'écran d\'accueil</b>.</li><li>Touche <b>Ajouter</b>.</li></ol>'+
   '<p class="note">Si tu ne vois pas l\'option, ouvre cette page dans Safari.</p><button class="btn primary" type="button" data-pwa="ok">Compris</button></div>';
  sheet.addEventListener('click',function(e){if(e.target===sheet||(e.target.getAttribute&&e.target.getAttribute('data-pwa')==='ok')){closeSheet();}});
  document.body.appendChild(sheet);
 }
 function install(){
  if(deferred){var d=deferred;deferred=null;d.prompt();(d.userChoice||Promise.resolve()).then(function(c){remove();if(!c||c.outcome!=='accepted'){set(String(Date.now()));}}).catch(function(){remove();});}
  else{showSheet();}
 }
 function show(){
  if(bar||standalone()||dismissed()||!mobile()){return;}
  if(!deferred&&!ios()){return;}
  bar=document.createElement('div');bar.className='pwa-bar';
  bar.innerHTML='<img src="icon-192.png" alt="" width="36" height="36"><span>Installer l\'appli</span><button type="button" class="btn primary" data-pwa="go">Installer</button><button type="button" class="pwa-x" data-pwa="x" aria-label="Fermer">×</button>';
  bar.addEventListener('click',function(e){var a=e.target.getAttribute&&e.target.getAttribute('data-pwa');if(a==='go'){install();}else if(a==='x'){set(String(Date.now()));remove();}});
  document.body.appendChild(bar);pos();
 }
 window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;setTimeout(show,1500);});
 window.addEventListener('appinstalled',function(){deferred=null;remove();closeSheet();set(String(Date.now()+365*864e5-DAYS*864e5));});
 window.addEventListener('load',function(){setTimeout(show,2500);setInterval(pos,700);});
 window.addEventListener('resize',pos);
 window.TK=window.TK||{};window.TK.pwa={show:show,_set:function(e){deferred=e;}};
})();
