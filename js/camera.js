/* Appareil photo intégré : cadre au format carte (63 x 88), recadrage automatique, flash (torche) quand le téléphone le permet. */
(function(){
window.TK=window.TK||{};
var RATIO=63/88;
TK.camera={
 supported:function(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)&&window.isSecureContext!==false;},
 open:function(opt){
  opt=opt||{};
  if(!TK.camera.supported()){if(opt.onFail){opt.onFail('indisponible');}return;}
  var ov=document.createElement('div');ov.className='camov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Appareil photo');
  ov.innerHTML='<video playsinline muted autoplay></video><div class="camframe"></div><div class="camhint"></div>'+
   '<div class="cambar"><button type="button" class="camb" data-c="close" aria-label="Fermer">✕</button><button type="button" class="camshot" data-c="shot" aria-label="Prendre la photo"></button><button type="button" class="camb" data-c="torch" aria-label="Flash" aria-pressed="false" style="visibility:hidden">⚡</button></div>'+
   '<button type="button" class="camgal" data-c="gal">Galerie</button><input type="file" accept="image/*" hidden>';
  ov.querySelector('.camhint').textContent=opt.hint||'Place la carte dans le cadre, bien à plat';
  document.body.appendChild(ov);
  var v=ov.querySelector('video'),fr=ov.querySelector('.camframe'),stream=null,track=null,torch=false,closed=false;
  function size(){
   var fh=Math.min(window.innerHeight*0.62,window.innerWidth*0.84/RATIO),fw=fh*RATIO;
   fr.style.width=fw+'px';fr.style.height=fh+'px';
  }
  size();window.addEventListener('resize',size);
  function close(){
   if(closed){return;}closed=true;window.removeEventListener('resize',size);
   if(stream){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}
   if(ov.parentNode){ov.parentNode.removeChild(ov);}
  }
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}).then(function(s){
   if(closed){s.getTracks().forEach(function(t){t.stop();});return;}
   stream=s;v.srcObject=s;track=s.getVideoTracks()[0];
   try{var caps=track.getCapabilities?track.getCapabilities():null;if(caps&&caps.torch){ov.querySelector('[data-c=torch]').style.visibility='visible';}}catch(e){}
  }).catch(function(){close();if(opt.onFail){opt.onFail('refusé');}});
  function shot(){
   var vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh){return;}
   var r=v.getBoundingClientRect(),f=fr.getBoundingClientRect();
   var sc=Math.max(r.width/vw,r.height/vh),ox=(r.width-vw*sc)/2,oy=(r.height-vh*sc)/2;
   var sx=Math.max(0,((f.left-r.left)-ox)/sc),sy=Math.max(0,((f.top-r.top)-oy)/sc),sw=Math.min(vw-sx,f.width/sc),sh=Math.min(vh-sy,f.height/sc);
   var k=Math.min(1,1400/Math.max(sw,sh)),cv=document.createElement('canvas');
   cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);
   cv.getContext('2d').drawImage(v,sx,sy,sw,sh,0,0,cv.width,cv.height);
   cv.toBlob(function(b){if(!b){return;}close();if(opt.onShot){opt.onShot(b);}},'image/jpeg',0.86);
  }
  ov.addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('[data-c]');if(!b){return;}
   var c=b.getAttribute('data-c');
   if(c==='close'){close();if(opt.onClose){opt.onClose();}}
   else if(c==='shot'){shot();}
   else if(c==='gal'){ov.querySelector('input').click();}
   else if(c==='torch'&&track){
    torch=!torch;
    track.applyConstraints({advanced:[{torch:torch}]}).then(function(){b.setAttribute('aria-pressed',String(torch));}).catch(function(){torch=!torch;b.style.visibility='hidden';});
   }
  });
  ov.querySelector('input').addEventListener('change',function(e){var fl=e.target.files&&e.target.files[0];if(fl){close();if(opt.onGallery){opt.onGallery(fl);}}});
 }
};
})();
