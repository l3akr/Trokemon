/* Appareil photo intégré : cadre au format carte (63 x 88), prise automatique quand la carte est bien placée et immobile,
   recadrage intelligent sur la carte, flash (torche) quand le téléphone le permet. */
(function(){
window.TK=window.TK||{};
var RATIO=63/88,EXPAND=1.2;

/* Cherche la carte dans une image (ImageData) : le fond est estimé sur le pourtour, la carte est ce qui s'en distingue.
   Renvoie {ok,x0,y0,x1,y1} en pixels de l'image, ok=true si le rectangle a une taille et un format plausibles. */
function detect(img){
 var w=img.width,h=img.height,d=img.data,m=Math.max(2,Math.round(Math.min(w,h)*0.04)),r=0,g=0,b=0,n=0,x,y,i;
 function acc(px,py){i=(py*w+px)*4;r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
 for(x=0;x<w;x++){for(y=0;y<m;y++){acc(x,y);acc(x,h-1-y);}}
 for(y=m;y<h-m;y++){for(x=0;x<m;x++){acc(x,y);acc(w-1-x,y);}}
 r/=n;g/=n;b/=n;
 var rows=new Float32Array(h),cols=new Float32Array(w);
 for(y=0;y<h;y++){for(x=0;x<w;x++){i=(y*w+x)*4;var dr=d[i]-r,dg=d[i+1]-g,db=d[i+2]-b;if(dr*dr+dg*dg+db*db>1500){rows[y]++;cols[x]++;}}}
 var y0=-1,y1=-1,x0=-1,x1=-1;
 for(y=0;y<h;y++){if(rows[y]/w>0.3){if(y0<0){y0=y;}y1=y;}}
 for(x=0;x<w;x++){if(cols[x]/h>0.3){if(x0<0){x0=x;}x1=x;}}
 if(y0<0||x0<0||y1<=y0||x1<=x0){return {ok:false};}
 var bw=x1-x0+1,bh=y1-y0+1,ratio=bw/bh,area=(bw*bh)/(w*h);
 return {ok:ratio>0.55&&ratio<0.9&&area>0.38&&area<1.01,x0:x0,y0:y0,x1:x1+1,y1:y1+1,ratio:ratio,area:area};
}
TK.camera={
 detect:detect,
 supported:function(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)&&window.isSecureContext!==false;},
 open:function(opt){
  opt=opt||{};
  if(!TK.camera.supported()){if(opt.onFail){opt.onFail('indisponible');}return;}
  var ov=document.createElement('div');ov.className='camov';ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Appareil photo');
  ov.innerHTML='<video playsinline muted autoplay></video><div class="camframe"></div><div class="camhint"></div>'+
   '<div class="cambar"><button type="button" class="camb" data-c="close" aria-label="Fermer">✕</button><button type="button" class="camshot" data-c="shot" aria-label="Prendre la photo"></button><button type="button" class="camb" data-c="torch" aria-label="Flash" aria-pressed="false" style="visibility:hidden">⚡</button></div>'+
   '<button type="button" class="camgal" data-c="gal">Galerie</button><button type="button" class="camauto" data-c="auto" aria-pressed="true">Auto</button><input type="file" accept="image/*" hidden>';
  var hint=ov.querySelector('.camhint'),base=opt.hint||'Place la carte dans le cadre, bien à plat';
  hint.textContent=base;
  document.body.appendChild(ov);
  var v=ov.querySelector('video'),fr=ov.querySelector('.camframe'),stream=null,track=null,torch=false,closed=false,auto=true,still=0,weak=0,prev=null,timer=null,busy=false;
  function size(){
   var fh=Math.min(window.innerHeight*0.6,window.innerWidth*0.8/RATIO),fw=fh*RATIO;
   fr.style.width=fw+'px';fr.style.height=fh+'px';
  }
  size();window.addEventListener('resize',size);
  function close(){
   if(closed){return;}closed=true;clearInterval(timer);window.removeEventListener('resize',size);
   if(stream){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}
   if(ov.parentNode){ov.parentNode.removeChild(ov);}
  }
  /* zone de la vidéo (en pixels source) qui correspond au cadre agrandi de EXPAND */
  function region(e){
   var vw=v.videoWidth,vh=v.videoHeight;if(!vw||!vh){return null;}
   var r=v.getBoundingClientRect(),f=fr.getBoundingClientRect();
   var sc=Math.max(r.width/vw,r.height/vh),ox=(r.width-vw*sc)/2,oy=(r.height-vh*sc)/2;
   var cx=f.left+f.width/2,cy=f.top+f.height/2,fw=f.width*e,fh=f.height*e;
   var sx=((cx-fw/2-r.left)-ox)/sc,sy=((cy-fh/2-r.top)-oy)/sc,sw=fw/sc,sh=fh/sc;
   var x0=Math.max(0,sx),y0=Math.max(0,sy),x1=Math.min(vw,sx+sw),y1=Math.min(vh,sy+sh);
   return {sx:x0,sy:y0,sw:x1-x0,sh:y1-y0};
  }
  function look(){
   if(closed||busy||!stream){return;}
   var rg=region(EXPAND);if(!rg||rg.sw<10){return;}
   var W=72,H=Math.max(10,Math.round(W*rg.sh/rg.sw)),cv=look.cv||(look.cv=document.createElement('canvas'));
   cv.width=W;cv.height=H;var cx=cv.getContext('2d',{willReadFrequently:true});
   cx.drawImage(v,rg.sx,rg.sy,rg.sw,rg.sh,0,0,W,H);
   var img=cx.getImageData(0,0,W,H),det=detect(img),motion=0;
   if(prev&&prev.length===img.data.length){for(var i=0;i<img.data.length;i+=16){motion+=Math.abs(img.data[i]-prev[i]);}motion/=img.data.length/16;}else{motion=99;}
   prev=new Uint8ClampedArray(img.data);
   if(det.ok){fr.classList.add('ok');}else{fr.classList.remove('ok');}
   if(!auto){hint.textContent=base;still=0;weak=0;return;}
   /* contraste du centre : sert de secours si le fond ressemble trop à la carte pour la détourer */
   var sum=0,sq=0,cnt=0,cw=img.width,ch=img.height;
   for(var yy=Math.round(ch*0.3);yy<ch*0.7;yy+=2){for(var xx=Math.round(cw*0.3);xx<cw*0.7;xx+=2){var ii=(yy*cw+xx)*4,gv=(img.data[ii]+img.data[ii+1]+img.data[ii+2])/3;sum+=gv;sq+=gv*gv;cnt++;}}
   var sd=cnt?Math.sqrt(Math.max(0,sq/cnt-(sum/cnt)*(sum/cnt))):0;
   var calm=motion<14;
   if(det.ok&&calm){still++;hint.textContent='Carte détectée, ne bouge plus…';if(still>=3){still=0;weak=0;shot();}}
   else if(!det.ok&&calm&&sd>28){weak++;still=0;hint.textContent='Ne bouge plus…';if(weak>=7){weak=0;shot();}}
   else{still=0;weak=0;hint.textContent=det.ok?'Carte détectée : stabilise le téléphone':'Cherche la carte… place-la dans le cadre';}
  }
  timer=setInterval(look,260);
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}).then(function(s){
   if(closed){s.getTracks().forEach(function(t){t.stop();});return;}
   stream=s;v.srcObject=s;track=s.getVideoTracks()[0];
   try{var caps=track.getCapabilities?track.getCapabilities():null;if(caps&&caps.torch){ov.querySelector('[data-c=torch]').style.visibility='visible';}}catch(e){}
  }).catch(function(){close();if(opt.onFail){opt.onFail('refusé');}});
  function shot(){
   if(busy){return;}
   var rg=region(1);if(!rg){return;}
   busy=true;
   /* recadrage exact : la photo = ce qui est dans le cadre à l'écran, sans détection ni décalage */
   var m=Math.min(1,1400/Math.max(rg.sw,rg.sh)),out=document.createElement('canvas');
   out.width=Math.round(rg.sw*m);out.height=Math.round(rg.sh*m);
   out.getContext('2d').drawImage(v,rg.sx,rg.sy,rg.sw,rg.sh,0,0,out.width,out.height);
   out.toBlob(function(b){busy=false;if(!b){return;}close();if(opt.onShot){opt.onShot(b,{smart:false});}},'image/jpeg',0.86);
  }
  ov.addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('[data-c]');if(!b){return;}
   var c=b.getAttribute('data-c');
   if(c==='close'){close();if(opt.onClose){opt.onClose();}}
   else if(c==='shot'){shot();}
   else if(c==='gal'){ov.querySelector('input').click();}
   else if(c==='auto'){auto=!auto;still=0;b.setAttribute('aria-pressed',String(auto));}
   else if(c==='torch'&&track){
    torch=!torch;
    track.applyConstraints({advanced:[{torch:torch}]}).then(function(){b.setAttribute('aria-pressed',String(torch));}).catch(function(){torch=!torch;b.style.visibility='hidden';});
   }
  });
  ov.querySelector('input').addEventListener('change',function(e){var fl=e.target.files&&e.target.files[0];if(fl){close();if(opt.onGallery){opt.onGallery(fl);}}});
 }
};
})();
