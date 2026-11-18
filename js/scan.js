/* Scan d'une carte : lecture (OCR) du numéro, du sigle de série et du nom, puis recherche de la carte exacte.
   Tesseract.js est chargé uniquement au premier scan (≈ 7 Mo, ensuite gardé en cache). */
(function(){
window.TK=window.TK||{};
var worker=null,loading=null;
function abs(p){return new URL(p,document.baseURI).href;}
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('ocr'));};document.head.appendChild(s);});}
async function getWorker(){
 if(worker){return worker;}
 if(loading){return loading;}
 loading=(async function(){
  if(!window.Tesseract){await loadScript('vendor/tesseract/tesseract.min.js');}
  var w=await Tesseract.createWorker('eng',1,{
   workerPath:abs('vendor/tesseract/worker.min.js'),
   corePath:abs('vendor/tesseract/tesseract-core-simd-lstm.wasm.js'),
   langPath:abs('vendor/tesseract'),gzip:true,logger:function(){}
  });
  worker=w;return w;
 })();
 try{return await loading;}catch(e){loading=null;throw e;}
}
/* découpe une bande de l'image, la met à l'échelle, niveaux de gris + contraste */
function strip(bmp,y0,y1,x0,x1,minW){
 var W=bmp.width||bmp.naturalWidth,H=bmp.height||bmp.naturalHeight,sw=W*(x1-x0),sh=H*(y1-y0),k=Math.max(1,minW/sw),c=document.createElement('canvas');
 c.width=Math.round(sw*k);c.height=Math.round(sh*k);
 var g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';
 g.drawImage(bmp,W*x0,H*y0,sw,sh,0,0,c.width,c.height);
 var im=g.getImageData(0,0,c.width,c.height),d=im.data,i,lo=255,hi=0,v;
 for(i=0;i<d.length;i+=4){v=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];d[i]=d[i+1]=d[i+2]=v;if(v<lo){lo=v;}if(v>hi){hi=v;}}
 var sc=hi>lo?255/(hi-lo):1;
 for(i=0;i<d.length;i+=4){v=(d[i]-lo)*sc;d[i]=d[i+1]=d[i+2]=v;}
 g.putImageData(im,0,0);return c;
}
async function toBitmap(blob){
 if(window.createImageBitmap){try{return await createImageBitmap(blob);}catch(e){}}
 return await new Promise(function(res,rej){var u=URL.createObjectURL(blob),im=new Image();im.onload=function(){res(im);};im.onerror=rej;im.src=u;});
}
/* texte brut : bas de carte (n°, sigle) et haut de carte (nom) */
async function read(blob){
 var w=await getWorker(),bmp=await toBitmap(blob),out={bottom:'',top:''};
 await w.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/ -.'});
 var rb=await w.recognize(strip(bmp,0.86,1,0,1,1400));out.bottom=rb.data.text||'';
 await w.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:''});
 var rt=await w.recognize(strip(bmp,0.02,0.14,0.05,0.8,1200));out.top=rt.data.text||'';
 return out;
}
/* extrait numéro / total / sigle / nom du texte lu */
function parse(t){
 var b=String(t.bottom||'').replace(/[|\\]/g,'/'),m=/(\d{1,3})\s*\/\s*(\d{2,3})/.exec(b),o={num:null,total:null,abbr:null,name:''};
 if(m){o.num=String(+m[1]);o.total=String(+m[2]);}
 var toks=b.toUpperCase().split(/[^A-Z0-9]+/).filter(function(x){return x.length>=2&&x.length<=5&&!/^\d+$/.test(x)&&x!=='FR'&&x!=='EN';});
 for(var i=0;i<toks.length;i++){if(TK.catalog&&TK.catalog.abbrSet(toks[i])){o.abbr=toks[i];break;}}
 var lines=String(t.top||'').split(/\n/).map(function(x){return x.replace(/[^A-Za-zÀ-ÿ' \-]/g,' ').replace(/\s+/g,' ').trim();}).filter(function(x){return x.length>=3;});
 lines.sort(function(a,c){return c.length-a.length;});
 o.name=(lines[0]||'').replace(/^(BASIC|STAGE \d|NIVEAU \d|BASE|DE BASE)\s+/i,'');
 return o;
}
/* lit puis cherche : {card, all, parsed} ou {query, parsed} ou null */
async function run(blob){
 var txt=await read(blob),p=parse(txt);
 TK.scan.last={text:txt,parsed:p};
 var r=null;
 if(p.num&&(p.abbr||p.total)){try{r=await TK.catalog.lookupScan(p);}catch(e){r=null;}}
 if(r&&r.card){return {card:r.card,all:r.all,parsed:p};}
 var q=[p.name,p.abbr,p.num].filter(Boolean).join(' ').trim();
 if(q.length>=3){return {query:q,parsed:p};}
 return null;
}
TK.scan={read:read,parse:parse,run:run,warm:function(){return getWorker();}};
})();
