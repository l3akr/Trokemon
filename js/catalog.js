/* Catalogue de cartes (TCGdex), recherche de lieux, liens d'achat, réduction de photos. */
(function(){
'use strict';
var TK=window.TK=window.TK||{},C=window.TK_CONFIG||{};

function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();}
TK.norm=norm;

/* ---------- lieux ---------- */
TK.PLACES=[
 {n:'Occitanie',k:'Région',lat:43.8,lng:2.0,z:7},{n:'Île-de-France',k:'Région',lat:48.7,lng:2.5,z:9},
 {n:'Nouvelle-Aquitaine',k:'Région',lat:45.0,lng:0.3,z:7},{n:'Auvergne-Rhône-Alpes',k:'Région',lat:45.5,lng:4.8,z:7},
 {n:'Provence-Alpes-Côte d\'Azur',k:'Région',lat:43.9,lng:6.0,z:8},{n:'Bretagne',k:'Région',lat:48.2,lng:-2.9,z:8},
 {n:'Hauts-de-France',k:'Région',lat:50.0,lng:2.8,z:8},{n:'Grand Est',k:'Région',lat:48.7,lng:6.2,z:7},
 {n:'Pays de la Loire',k:'Région',lat:47.5,lng:-0.8,z:8},{n:'Normandie',k:'Région',lat:49.1,lng:0.2,z:8},
 {n:'Bourgogne-Franche-Comté',k:'Région',lat:47.2,lng:4.8,z:7},{n:'Centre-Val de Loire',k:'Région',lat:47.5,lng:1.7,z:8},
 {n:'Corse',k:'Région',lat:42.15,lng:9.1,z:8},
 {n:'Toulouse',k:'Ville',lat:43.6047,lng:1.4442,z:12},{n:'Paris',k:'Ville',lat:48.8566,lng:2.3522,z:12},
 {n:'Lyon',k:'Ville',lat:45.764,lng:4.8357,z:12},{n:'Marseille',k:'Ville',lat:43.2965,lng:5.3698,z:12},
 {n:'Bordeaux',k:'Ville',lat:44.8378,lng:-0.5792,z:12},{n:'Nantes',k:'Ville',lat:47.2184,lng:-1.5536,z:12},
 {n:'Lille',k:'Ville',lat:50.6292,lng:3.0573,z:12},{n:'Montpellier',k:'Ville',lat:43.6108,lng:3.8767,z:12},
 {n:'Strasbourg',k:'Ville',lat:48.5734,lng:7.7521,z:12},{n:'Nice',k:'Ville',lat:43.7102,lng:7.262,z:12},
 {n:'Rennes',k:'Ville',lat:48.1173,lng:-1.6778,z:12}
];

/* Recherche de lieu : régions et grandes villes en local ; communes, codes postaux et départements via
   l'API Géo (geo.api.gouv.fr) ; lieux plus fins (hameaux, adresses) via le Géocodeur de la Géoplateforme (IGN). */
function jget(url){return fetch(url).then(function(r){if(!r.ok){throw new Error('geo');}return r.json();});}
function communeToPlace(c,cp){
 if(!c.centre||!c.centre.coordinates){return null;}
 var postal=cp||(c.codesPostaux&&c.codesPostaux.length?(c.codesPostaux.length>1?c.codesPostaux[0]+'…':c.codesPostaux[0]):'');
 return {n:c.nom+(postal?' ('+postal+')':c.departement?' ('+c.departement.code+')':''),base:c.nom,k:'Commune'+(c.departement?' · '+c.departement.nom:''),lat:c.centre.coordinates[1],lng:c.centre.coordinates[0],z:12};
}
TK.geo={
 suggest:async function(q){
  q=String(q||'').trim();var n=norm(q);if(!n){return [];}
  var F='fields=nom,centre,departement,codesPostaux',out=[],seen={};
  function add(p){if(!p){return;}var key=norm(p.base||p.n)+'|'+Math.round(p.lat*50)+'|'+Math.round(p.lng*50);if(!seen[key]){seen[key]=1;out.push(p);}}
  var local=TK.PLACES.filter(function(p){return norm(p.n).indexOf(n)>-1;}).slice(0,4);
  try{
   if(/^\d{5}$/.test(q)){
    var cs=await jget('https://geo.api.gouv.fr/communes?codePostal='+q+'&'+F+'&limit=25');
    cs.forEach(function(c){add(communeToPlace(c,q));});
    if(!out.length){
     var g=await jget('https://data.geopf.fr/geocodage/search?q='+encodeURIComponent(q)+'&type=municipality&limit=5');
     (g.features||[]).forEach(function(f){var pr=f.properties||{};add({n:(pr.city||pr.label)+' ('+(pr.postcode||q)+')',base:pr.city||pr.label,k:'Commune',lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],z:12});});
    }
   }else if(/^\d{2,3}[AB]?$/i.test(q)){
    var ds=await jget('https://geo.api.gouv.fr/departements?code='+encodeURIComponent(q.toUpperCase()));
    for(var i=0;i<ds.length;i++){
     var big=await jget('https://geo.api.gouv.fr/communes?codeDepartement='+ds[i].code+'&'+F+'&boost=population&limit=1');
     if(big[0]&&big[0].centre){out.push({n:ds[i].nom+' ('+ds[i].code+')',base:ds[i].nom,k:'Département',lat:big[0].centre.coordinates[1],lng:big[0].centre.coordinates[0],z:9});}
    }
   }else if(/^\d+$/.test(q)){
    return [];
   }else{
    var res=await Promise.all([
     jget('https://geo.api.gouv.fr/communes?nom='+encodeURIComponent(q)+'&'+F+'&boost=population&limit=10').catch(function(){return [];}),
     q.length>=3?jget('https://geo.api.gouv.fr/departements?nom='+encodeURIComponent(q)).catch(function(){return [];}):Promise.resolve([])
    ]);
    res[0].forEach(function(c){add(communeToPlace(c));});
    for(var k=0;k<Math.min(res[1].length,2);k++){
     try{var b2=await jget('https://geo.api.gouv.fr/communes?codeDepartement='+res[1][k].code+'&'+F+'&boost=population&limit=1');
      if(b2[0]&&b2[0].centre){add({n:res[1][k].nom+' ('+res[1][k].code+')',base:res[1][k].nom,k:'Département',lat:b2[0].centre.coordinates[1],lng:b2[0].centre.coordinates[0],z:9});}}catch(e){}
    }
    if(out.length<3){
     try{
      var g2=await jget('https://data.geopf.fr/geocodage/search?q='+encodeURIComponent(q)+'&limit=5');
      (g2.features||[]).forEach(function(f){var pr=f.properties||{};add({n:pr.label,base:pr.label,k:pr.type==='municipality'?'Commune':'Lieu',lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],z:pr.type==='municipality'?12:14});});
     }catch(e){}
    }
   }
  }catch(e){}
  return local.concat(out).filter(function(p){return p;}).slice(0,10);
 }
};

/* ---------- photos : réduction avant envoi ---------- */
TK.shrink=async function(file,max){
 max=max||1400;
 var bmp;
 try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'});}
 catch(e){
  bmp=await new Promise(function(res,rej){
   var img=new Image(),u=URL.createObjectURL(file);
   img.onload=function(){res(img);};img.onerror=function(){rej(new Error('Image illisible.'));};img.src=u;
  });
 }
 var w=bmp.width||bmp.naturalWidth,h=bmp.height||bmp.naturalHeight,k=Math.min(1,max/Math.max(w,h));
 var cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);
 cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
 return new Promise(function(res,rej){cv.toBlob(function(b){b?res(b):rej(new Error('Image illisible.'));},'image/jpeg',0.82);});
};

/* ---------- produits scellés ---------- */
TK.SEALED_SHORT={'Display':'DISPLAY','Booster':'BOOSTER','Coffret Dresseur d\'élite (ETB)':'ETB','Tripack':'TRIPACK','Bundle de boosters':'BUNDLE','Coffret / Collection':'COFFRET'};
TK.SEALED_KINDS=['Display','Booster','Coffret Dresseur d\'élite (ETB)','Tripack','Bundle de boosters','Coffret / Collection','Autre'];

/* ---------- liens d'achat neuf ---------- */
/* Lien Cardmarket : fiche produit si l'identifiant est connu, sinon recherche des singles. */
TK.cmUrl=function(it,idProduct){
 if(idProduct){return 'https://www.cardmarket.com/fr/Pokemon/Products?idProduct='+encodeURIComponent(idProduct)+'&language=2';}
 var base=String(it.name||'').replace(/[‐-―\-]+/g,' ').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
 var ab=it.set_abbr||(it.set_id&&TK.catalog&&TK.catalog.abbr?TK.catalog.abbr(it.set_id):null),ln=String(it.number||it.localId||'').split('/')[0].replace(/\D/g,'');
 if(ab&&ln){base+=' '+ab+' '+('000'+ln).slice(-3);}
 return 'https://www.cardmarket.com/fr/Pokemon/Products/Singles?searchString='+encodeURIComponent(base)+'&language=2';
};
/* Images d'un item : catalogue enregistré, sinon reconstruite depuis la série et le numéro. */
TK.catImg=function(it,q){
 var src=it.catalog_image;
 if(!src&&it.set_id&&it.number&&String(it.set_id).indexOf('demo-')!==0){
  var sid=it.set_id,ln=String(it.number).split('/')[0];
  src='https://assets.tcgdex.net/fr/'+TK.eraOf(sid).serie+'/'+sid+'/'+ln;
 }
 if(!src){return null;}
 return src.replace(/\/(low|high)\.(webp|png|jpg)$/,'')+'/'+(q||'high')+'.webp';
};
/* Produit scellé : type de produit reconnu + série => requête précise (et filtres « neuf » côté eBay). */
TK.sealedQuery=function(it){
 var n=String(it.name||'').toLowerCase(),sn=String(it.set_name||''),code='',m=sn.match(/\(([^)]+)\)\s*$/);
 if(m){code=m[1];sn=sn.replace(/\s*\([^)]+\)\s*$/,'');}
 var kind=/display/.test(n)?'display 36 boosters':/etb|[ée]lite|dresseur/.test(n)?'coffret dresseur d\'élite ETB':/bundle|lot de/.test(n)?'bundle 6 boosters':/tripack|tri-pack|trio/.test(n)?'tripack boosters':/booster/.test(n)?'booster':/tin|pokébox|pokebox/.test(n)?'pokébox tin':/ultra/.test(n)?'coffret ultra premium':/coffret|collection/.test(n)?'coffret collection':String(it.name||'');
 var extra=/etb|[ée]lite|dresseur|display|bundle|tripack|booster/.test(n)?'':' '+String(it.name||'');
 var keys=(kind+extra+' '+sn+' '+code).replace(/\s+/g,' ').trim();
 return {q:keys+' pokemon',cm:(String(it.name||'')+' '+sn).trim(),code:code};
};
TK.buyLinks=function(it){
 var a=C.AFFILIATE||{},sq=TK.sealedQuery(it),q=encodeURIComponent(sq.q);
 var ebay='https://www.ebay.fr/sch/i.html?_nkw='+q+'&LH_ItemCondition=1000&LH_BIN=1&_sop=15'+(a.ebay?'&'+String(a.ebay).replace(/^[?&]/,''):'');
 var amz='https://www.amazon.fr/s?k='+q+(a.amazon?'&tag='+encodeURIComponent(a.amazon):'');
 var cm='https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString='+encodeURIComponent(sq.cm);
 return [{label:'Cardmarket',url:cm,aff:false},{label:'eBay',url:ebay,aff:!!a.ebay},{label:'Amazon',url:amz,aff:!!a.amazon}];
};

/* ---------- catalogue TCGdex ---------- */
var API='https://api.tcgdex.net/v2/fr';
var setsCache=null,setIdx={},hiddenSets=[];

TK.DEMO_SETS=[
 {id:'demo-151',name:'Écarlate et Violet 151',official:165},
 {id:'demo-pe',name:'Évolutions Prismatiques',official:131},
 {id:'demo-nn',name:'Nuit Noire (ME05)',official:80},
 {id:'demo-base',name:'Série de base',official:102}
];
/* Cartes d'exemple pour le mode démo (hors ligne ou si le catalogue ne répond pas). Données fictives. */
TK.DEMO_CARDS=[
 {card_id:'d1',name:'Dracaufeu ex',number:'199/165',set_id:'demo-151',set_name:'Écarlate et Violet 151',type:'loose',val:45},
 {card_id:'d2',name:'Mew ex',number:'193/165',set_id:'demo-151',set_name:'Écarlate et Violet 151',type:'loose',val:18},
 {card_id:'d3',name:'Pikachu',number:'094/131',set_id:'demo-pe',set_name:'Évolutions Prismatiques',type:'graded',company:'PSA',grade:'9',val:120},
 {card_id:'d4',name:'Évoli ex',number:'118/131',set_id:'demo-pe',set_name:'Évolutions Prismatiques',type:'loose',val:60},
 {card_id:'d5',name:'Display',number:null,set_id:'demo-nn',set_name:'Nuit Noire (ME05)',type:'sealed',val:150},
 {card_id:'d6',name:'Coffret Dresseur d\'élite (ETB)',number:null,set_id:'demo-nn',set_name:'Nuit Noire (ME05)',type:'sealed',val:55},
 {card_id:'d7',name:'Booster',number:null,set_id:'demo-nn',set_name:'Nuit Noire (ME05)',type:'sealed',val:5},
 {card_id:'d8',name:'Mewtwo',number:'150/165',set_id:'demo-151',set_name:'Écarlate et Violet 151',type:'graded',company:'PSA',grade:'10',val:210},
 {card_id:'d9',name:'Lucario',number:'102/96',set_id:'demo-nn',set_name:'Nuit Noire (ME05)',type:'loose',val:12},
 {card_id:'d10',name:'Display',number:null,set_id:'demo-151',set_name:'Écarlate et Violet 151',type:'sealed',val:190},
 {card_id:'d11',name:'Ectoplasma',number:'045/80',set_id:'demo-nn',set_name:'Nuit Noire (ME05)',type:'loose',val:25},
 {card_id:'d12',name:'Dracaufeu',number:'004/102',set_id:'demo-base',set_name:'Série de base',type:'graded',company:'PSA',grade:'7',val:180}
];

/* ---------- générations (séries regroupées) ---------- */
var ERAS=[['me','Méga-Évolution'],['sv','Écarlate et Violet'],['swsh','Épée et Bouclier'],['sm','Soleil et Lune'],['xy','XY'],['bw','Noir et Blanc'],['hgss','HeartGold et SoulSilver'],['dp','Diamant et Perle'],['pl','Platine'],['ex','EX'],['ecard','e-Card'],['neo','Néo'],['gym','Gym'],['base','Wizards (Base)']];
/* Renvoie {k, n, o, serie} : clé, nom, ordre d'affichage (récent d'abord) et dossier de la série chez TCGdex. */
TK.eraOf=function(setId){
 var id=String(setId||'');
 if(/^30th/i.test(id)){return {k:'me',n:'Méga-Évolution',o:0,serie:'me'};}
 if(id.indexOf('demo-')===0){return {k:'demo',n:'Démo',o:50,serie:''};}
 if(/^[A-Z]/.test(id)){return {k:'pocket',n:'TCG Pocket',o:97,serie:''};}
 var m=id.match(/^[a-z]+/),pre=m?m[0]:'',c=[pre,pre.replace(/p$/,'')];
 for(var j=0;j<c.length;j++){for(var i=0;i<ERAS.length;i++){if(ERAS[i][0]===c[j]){return {k:ERAS[i][0],n:ERAS[i][1],o:i,serie:ERAS[i][0]};}}}
 return {k:'autres',n:'Autres séries et promos',o:98,serie:pre};
};
/* Image de secours : si l'image française manque, essaie la version anglaise ; sinon pastille. */
var UPH={},UQ=[],UT=null;
function userPhotos(ids){
 var need=ids.filter(function(i){return i&&!(i in UPH);});
 if(!need.length||!TK.db||!TK.db.cardPhotos){return Promise.resolve();}
 return TK.db.cardPhotos(need.slice(0,200)).then(function(m){need.forEach(function(i){UPH[i]=(m&&m[i])||null;});}).catch(function(){need.forEach(function(i){UPH[i]=null;});});
}
function imgPh(el){
 var n=(el.getAttribute('data-n')||'?').charAt(0).toUpperCase(),sp=document.createElement('span');
 sp.className=el.className.replace('cimg','cph').replace('cthumb','cph')+' cph';sp.setAttribute('aria-hidden','true');sp.textContent=n;
 sp.style.background='var(--surface2)';
 if(el.parentNode){el.parentNode.replaceChild(sp,el);}
}
window.TK_imgFallback=function(el){
 var src=el.getAttribute('src')||'',fb=el.getAttribute('data-fb')||'';
 if(!fb&&src.indexOf('/fr/')>-1){el.setAttribute('data-fb','1');el.src=src.replace('/fr/','/en/');return;}
 if(fb==='1'&&src.indexOf('/en/')>-1){el.setAttribute('data-fb','2');el.src=src.replace('/en/','/ja/');return;}
 var cid=el.getAttribute('data-cid');
 /* dernier recours : photo d'une carte identique postée par un utilisateur */
 if(cid&&fb!=='u'){el.setAttribute('data-fb','u');userPhotos([cid]).then(function(){if(UPH[cid]){el.src=UPH[cid];}else{imgPh(el);}});return;}
 imgPh(el);
};

var abbrMap={},abbrIdx={},setCache={},nameCache={};
var abbrDone=false;
try{var ab=JSON.parse(localStorage.getItem('tk_abbr')||'null');if(ab&&ab.m&&Date.now()-ab.t<7*864e5){abbrMap=ab.m;abbrDone=!!ab.d;}}catch(e){}
function indexAbbr(){abbrIdx={};Object.keys(abbrMap).forEach(function(id){abbrIdx[String(abbrMap[id]).toUpperCase()]=id;});}
indexAbbr();
function saveAbbr(done){try{localStorage.setItem('tk_abbr',JSON.stringify({t:Date.now(),m:abbrMap,d:done||abbrDone?1:0}));}catch(e){}}
/* Remplace la cote enregistrée (souvent absente ou fausse) par celle du fichier data/prices.json. */
async function enrichItems(list){
 var pf=await priceFile();if(!pf||!pf.c||!list){return list;}
 list.forEach(function(it){
  if(!it||it.type!=='loose'||!it.card_id||it.value_source==='user'){return;}
  var e=pf.c[it.card_id];if(!e){return;}
  var foil=/reverse|holo|foil/i.test(it.variant||''),v=(foil&&e[4])||e[1]||e[2]||e[3]||null;
  if(v){it.value_eur=v;it.value_source='cardmarket';}
 });
 return list;
}
var PF=null;
async function priceFile(){
 if(PF!==null){return PF||null;}
 try{var r=await fetch('data/prices.json',{cache:'no-cache'});PF=r.ok?await r.json():false;}catch(e){PF=false;}
 return PF||null;
}
function setAbbr(id,v){if(v&&abbrMap[id]!==v){abbrMap[id]=v;indexAbbr();saveAbbr();}}
function lowRarity(r,name){
 var n=norm(r||'');
 if(/(^| )(ex|gx|v|vmax|vstar|vunion|break|prime|legend)( |$)/i.test(String(name||''))){return false;}
 return ['commune','peu commune','peu courante','rare','holo rare','rare holo','common','uncommon'].indexOf(n)>-1;
}
function numCmp(a,b){var x=parseInt(a,10),y=parseInt(b,10);if(isNaN(x)||isNaN(y)){return String(a).localeCompare(String(b));}return x-y;}
function stripZ(x){return String(x==null?'':x).replace(/^0+(?=\d)/,'');}
function cardOut(c,sid){
 var s=setIdx[sid],off=s&&s.official,sn=s?s.name:sid;
 if(sid==='30th-c'&&setIdx['30th']){sn=setIdx['30th'].name;}
 var img=c.image?c.image+'/low.webp':(sid&&sid.indexOf('demo-')!==0?'https://assets.tcgdex.net/fr/'+TK.eraOf(sid).serie+'/'+sid+'/'+c.localId+'/low.webp':null);
 return {card_id:c.id,name:c.name,localId:c.localId,number:off?c.localId+'/'+off:String(c.localId),set_id:sid,set_name:sn,set_abbr:abbrMap[sid==='30th-c'?'30th':sid]||abbrMap[sid]||null,image:img};
}
/* Analyse « Mega Darkrai PBL 110/84 » -> mots, numéro, série reconnue par son sigle. */
function parseQuery(q){
 var toks=String(q||'').replace(/[()\-–#]/g,' ').split(/\s+/).filter(Boolean),words=[],num=null,sid=null;
 toks.forEach(function(t){
  if(/^\d+(\/\d+)?$/.test(t)){num=t;}
  else if(t.length>=2&&t.length<=5&&abbrIdx[t.toUpperCase()]&&!sid){sid=abbrIdx[t.toUpperCase()];}
  else{words.push(t);}
 });
 return {words:words,num:num,setId:sid};
}
function matchLocal(list,p){
 return list.filter(function(c){
  var n=norm(c.name);
  for(var i=0;i<p.words.length;i++){if(n.indexOf(norm(p.words[i]))<0){return false;}}
  if(p.num){var left=stripZ(String(p.num).split('/')[0]);if(stripZ(c.localId)!==left){return false;}}
  return true;
 });
}
async function fetchSet(id){
 if(setCache[id]){return setCache[id];}
 var r=await fetch(API+'/sets/'+encodeURIComponent(id));
 if(!r.ok){throw new Error('catalogue');}
 var j=await r.json();
 if(j.abbreviation&&(j.abbreviation.official||j.abbreviation.normal)){setAbbr(id,j.abbreviation.official||j.abbreviation.normal);}
 setCache[id]=j;return j;
}

var cardIdx=null,idxLoading=false;
function buildIdx(slim){return slim.map(function(x){var k=x[0].lastIndexOf('-');return {id:x[0],localId:x[1],name:x[2],image:x[3]||undefined,sid:x[0].slice(0,k),n:norm(x[2])};});}
function idbOpen(){return new Promise(function(res,rej){try{var q=indexedDB.open('trokemon',1);q.onupgradeneeded=function(){q.result.createObjectStore('kv');};q.onsuccess=function(){res(q.result);};q.onerror=function(){rej(q.error);};}catch(e){rej(e);}});}
async function idbGet(k){try{var db=await idbOpen();return await new Promise(function(res){var r=db.transaction('kv').objectStore('kv').get(k);r.onsuccess=function(){res(r.result);};r.onerror=function(){res(null);};});}catch(e){return null;}}
async function idbSet(k,v){try{var db=await idbOpen();db.transaction('kv','readwrite').objectStore('kv').put(v,k);}catch(e){}}
TK.catalog={
 enrich:enrichItems,
 abbr:function(id){return abbrMap[id]||null;},
 setAbbrs:function(m){Object.keys(m).forEach(function(k){abbrMap[k]=m[k];});indexAbbr();},
 sets:async function(){
  if(setsCache){return setsCache;}
  try{
   var r=await fetch(API+'/sets');
   if(!r.ok){throw new Error('catalogue');}
   var j=await r.json();
   setsCache=j.map(function(s){return {id:s.id,name:s.name,logo:s.logo?s.logo+'.png':null,symbol:s.symbol?s.symbol+'.png':null,official:s.cardCount&&s.cardCount.official,total:s.cardCount&&s.cardCount.total};}).reverse();
   var i30=setsCache.map(function(s){return s.id;}).indexOf('30th-c');
   if(i30>-1&&setsCache.some(function(s){return s.id==='30th';})){hiddenSets.push(setsCache.splice(i30,1)[0]);}
  }catch(e){
   if(!TK.demo){throw new Error('Catalogue indisponible pour le moment. Réessaie dans un instant.');}
   setsCache=TK.DEMO_SETS.slice();TK.catalog.setAbbrs({'demo-nn':'PBL','demo-151':'MEW','demo-pe':'PRE','demo-base':'BS'});
  }
  setsCache.concat(hiddenSets).forEach(function(s){setIdx[s.id]=s;});
  TK.catalog.loadAbbr();TK.catalog.loadIndex();
  return setsCache;
 },
 /* Sigles des séries (PBL, MEW…) : une requête GraphQL, sinon lecture en tâche de fond de chaque série (mise en cache 7 jours). */
 loadAbbr:async function(){
  if(TK.catalog._abbrTried||TK.demo){return;}
  TK.catalog._abbrTried=true;
  if(abbrDone){return;}
  var notify=function(){if(TK.catalog.onAbbr){TK.catalog.onAbbr();}};
  try{
   var r=await fetch('https://api.tcgdex.net/v2/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'{ sets(filters:{}) { id abbreviation { official normal } } }'})});
   if(r.ok){
    var j=await r.json(),arr=(j.data&&j.data.sets)||[];
    arr.forEach(function(x){var v=x.abbreviation&&(x.abbreviation.official||x.abbreviation.normal);if(v){abbrMap[x.id]=v;}});
    if(Object.keys(abbrMap).length>20){abbrDone=true;indexAbbr();saveAbbr(true);notify();return;}
   }
  }catch(e){}
  var ids=(setsCache||[]).map(function(s){return s.id;}).filter(function(id){return !abbrMap[id]&&id.indexOf('demo-')!==0;}),pos=0,n=0,fails=0;
  async function worker(){
   while(pos<ids.length){
    var id=ids[pos++];
    try{
     var rr=await fetch(API+'/sets/'+encodeURIComponent(id));
     if(rr.ok){var s=await rr.json(),v=s.abbreviation&&(s.abbreviation.official||s.abbreviation.normal);if(v){abbrMap[id]=v;}}else{fails++;}
    }catch(e){fails++;}
    if(++n%20===0){indexAbbr();saveAbbr();notify();}
   }
  }
  await Promise.all([worker(),worker(),worker(),worker(),worker(),worker()]);
  indexAbbr();abbrDone=fails<ids.length/4;saveAbbr();notify();
 },
 /* Index local de toutes les cartes (nom, numéro) pour une recherche sans accents ni majuscules. Mis en cache dans IndexedDB. */
 loadIndex:async function(){
  if(cardIdx||idxLoading||TK.demo){return;}
  idxLoading=true;
  try{
   var cached=await idbGet('cards');
   if(cached&&cached.list&&Date.now()-cached.t<3*864e5){cardIdx=buildIdx(cached.list);}
   else{
    var r=await fetch(API+'/cards');
    if(r.ok){
     var j=await r.json();
     if(Array.isArray(j)&&j.length>2000){
      var slim=j.map(function(x){return [x.id,x.localId,x.name,x.image||''];});
      idbSet('cards',{t:Date.now(),list:slim});cardIdx=buildIdx(slim);
     }
    }
   }
  }catch(e){}
  idxLoading=false;
  if(cardIdx&&TK.catalog.onIndex){TK.catalog.onIndex();}
 },
 /* Recherche : nom, sigle de série, numéro, dans n'importe quel ordre. Renvoie {list, hint}. */
 search:async function(q,setId){
  await TK.catalog.sets();
  var p=parseQuery(q),sid=setId||p.setId,list=[],hint='';
  function demoList(){
   var nn=norm(q||'');
   return TK.DEMO_CARDS.filter(function(c){return c.type!=='sealed'&&(!nn||norm(c.name).indexOf(nn)>-1)&&(!sid||c.set_id===sid);}).map(function(c){
    return {card_id:c.card_id,name:c.name,localId:c.number?String(c.number).split('/')[0]:'',number:c.number,set_id:c.set_id,set_name:c.set_name,set_abbr:abbrMap[c.set_id]||null,image:null,val:c.val};
   });
  }
  if(!p.words.length&&!p.num&&!sid){return {list:[],hint:''};}
  if(sid&&sid.indexOf('demo-')===0){return {list:demoList(),hint:''};}
  if(!sid&&!p.words.length&&p.num){return {list:[],hint:'Ajoute le nom de la carte, le sigle de la série (ex. PBL 110) ou choisis une série.'};}
  try{
   if(sid&&setIdx[sid]){
    var set=await fetchSet(sid);
    list=matchLocal((set.cards||[]).map(function(c){return {id:c.id,localId:c.localId,name:c.name,image:c.image};}),p).map(function(c){return cardOut(c,sid);});
    if(sid==='30th'&&setIdx['30th-c']){
     try{var sc=await fetchSet('30th-c');list=list.concat(matchLocal((sc.cards||[]).map(function(c){return {id:c.id,localId:c.localId,name:c.name,image:c.image};}),p).map(function(c){return cardOut(c,'30th-c');}));}catch(e0){}
    }
   }else{
    if(!cardIdx){TK.catalog.loadIndex();}
    var key=norm(p.words.slice().sort(function(a,b){return b.length-a.length;})[0]);
    if(cardIdx){
     var ws=p.words.map(norm);
     list=cardIdx.filter(function(c){for(var i=0;i<ws.length;i++){if(c.n.indexOf(ws[i])<0){return false;}}return true;});
     list=matchLocal(list,{words:[],num:p.num}).map(function(c){return cardOut(c,c.sid);});
    }else{
    if(!nameCache[key]){
     var r=await fetch(API+'/cards?name='+encodeURIComponent(key));
     if(!r.ok){throw new Error('catalogue');}
     nameCache[key]=await r.json();
    }
    list=matchLocal(nameCache[key].map(function(c){var i=c.id.lastIndexOf('-');return {id:c.id,localId:c.localId,name:c.name,image:c.image,sid:c.id.slice(0,i)};}),p).map(function(c){return cardOut(c,c.sid);});
    }
   }
  }catch(e){
   if(!TK.demo){throw new Error('Catalogue indisponible pour le moment. Réessaie dans un instant.');}
   return {list:demoList(),hint:''};
  }
  var order={};(setsCache||[]).forEach(function(s,i){order[s.id]=i;});
  list.sort(function(a,b){var d=(order[a.set_id]==null?9999:order[a.set_id])-(order[b.set_id]==null?9999:order[b.set_id]);return d||numCmp(a.localId,b.localId);});
  try{
   var miss=list.filter(function(c){return !c.image&&c.card_id;});
   if(miss.length){
    await Promise.race([userPhotos(miss.map(function(c){return c.card_id;})),new Promise(function(r){setTimeout(r,1500);})]);
    miss.forEach(function(c){if(UPH[c.card_id]){c.image=UPH[c.card_id];}});
   }
  }catch(e7){}
  return {list:list,hint:''};
 },
 /* Détail d'une carte : prix Cardmarket (EUR), image HD, rareté, versions disponibles. */
 detail:async function(cardId){
  if(/^d\d+$/.test(cardId)){
   var dc=TK.DEMO_CARDS.filter(function(c){return c.card_id===cardId;})[0];
   if(!dc){return null;}
   return {price:dc.val,priceFoil:dc.val*1.6,updated:new Date().toISOString(),image:null,rarity:dc.val<20?'Commune':'Double rare',low:dc.val<20&&!/ ex$/i.test(dc.name),variants:['Normale','Reverse','Reverse · Poké Ball']};
  }
  try{
   var r=await fetch(API+'/cards/'+encodeURIComponent(cardId));
   if(!r.ok){return null;}
   var c=await r.json(),cm=(c.pricing&&c.pricing.cardmarket)||{};
   function num(v){v=Number(v);return isFinite(v)&&v>0?v:null;}
   function first(o,keys){for(var k=0;k<keys.length;k++){var n=num(o&&o[keys[k]]);if(n){return n;}}return null;}
   var price=first(cm,['trend','avg','avg7','avg30','low']),foil=first(cm,['trend-holo','avg-holo','avg7-holo','avg30-holo','low-holo']),at=null;
   if(!price&&!foil){['normal','holo','reverse'].forEach(function(k){if(cm[k]&&typeof cm[k]==='object'){var n=first(cm[k],['trend','avg','avg7','avg30','low','market']);if(n){if(k==='normal'){price=price||n;}else{foil=foil||n;}}}});}
   if(cm.updated){try{at=typeof cm.updated==='number'?new Date(cm.updated<1e12?cm.updated*1000:cm.updated):new Date(cm.updated);if(isNaN(at)){at=null;}}catch(e2){at=null;}}
   var VT={normal:'Normale',reverse:'Reverse',holo:'Holo'},out=[];
   try{
    var vd=c.variants_detailed;if(vd&&!Array.isArray(vd)){vd=Object.keys(vd).map(function(k){return typeof vd[k]==='object'?Object.assign({type:k},vd[k]):{type:k};});}
    (vd||[]).forEach(function(v){
     var ex=[];if(v.foil){ex.push(v.foil);}if(v.stamp&&v.stamp.length){ex.push('tampon '+[].concat(v.stamp).join('/'));}if(v.subtype){ex.push(v.subtype);}
     var lab=(VT[v.type]||v.type||'Normale')+(ex.length?' · '+ex.join(', '):'');
     if(out.indexOf(lab)<0){out.push(lab);}
    });
   }catch(e3){out=[];}
   if(!out.length){var vv=c.variants||{};if(vv.normal){out.push('Normale');}if(vv.reverse){out.push('Reverse');}if(vv.holo){out.push('Holo');}if(vv.firstEdition){out.push('1re édition');}}
   if(!out.length){out.push('Normale');}
   if(c.set&&c.set.id&&c.set.abbreviation){setAbbr(c.set.id,c.set.abbreviation.official||c.set.abbreviation.normal);}
   var idp=cm.idProduct||cm.productId||null,doubt=false;
   var pf=await priceFile(),pe=pf&&pf.c&&pf.c[c.id];
   if(pe){idp=pe[0];price=pe[1]||pe[2]||pe[3]||null;foil=pe[4]||null;if(pf.createdAt){var d0=new Date(String(pf.createdAt).replace(/([+-]\d\d)(\d\d)$/,'$1:$2'));if(!isNaN(d0)){at=d0;}}}
   /* TCGdex associe parfois plusieurs versions d'une même carte (ex. 084 et 138 dans le même set) au même produit Cardmarket.
      Si une carte de même nom et de numéro inférieur dans ce set a le même produit ou la même cote, on n'a aucune cote fiable pour celle-ci. */
   try{
    if(!pe&&(idp||price)&&c.set&&c.set.id){
     var sr=await fetch(API+'/sets/'+encodeURIComponent(c.set.id));
     if(sr.ok){
      var sj=await sr.json(),mine=Number(c.localId),sib=(sj.cards||[]).filter(function(x){return x.name===c.name&&x.id!==c.id&&Number(x.localId)<mine;}).slice(0,4);
      for(var si=0;si<sib.length&&!doubt;si++){
       var xr=await fetch(API+'/cards/'+encodeURIComponent(sib[si].id));
       if(!xr.ok){continue;}
       var xc=await xr.json(),xm=(xc.pricing&&xc.pricing.cardmarket)||{},xi=xm.idProduct||xm.productId||null;
       if((idp&&xi&&String(xi)===String(idp))||(!idp&&price&&first(xm,['trend','avg','avg7','avg30','low'])===price)){doubt=true;}
      }
     }
    }
   }catch(e5){}
   if(doubt){idp=null;price=null;foil=null;}
   /* Fiche directe Cardmarket : /Singles/{Set-en}/{Nom-en}[-Vn]-{ABR}{NNN} (nom anglais ; Vn = rang parmi les cartes de même nom du set). Déduit, non vérifié. */
   var direct=null;
   try{
    var API_EN='https://api.tcgdex.net/v2/en',ab0=abbrMap[(c.set&&c.set.id)||''];
    if(!idp&&ab0&&c.set&&c.set.id){
     var er=await fetch(API_EN+'/cards/'+encodeURIComponent(c.id)),esr=await fetch(API_EN+'/sets/'+encodeURIComponent(c.set.id));
     if(er.ok&&esr.ok){
      var ec=await er.json(),es=await esr.json();
      var same=(es.cards||[]).filter(function(x){return x.name===ec.name;}).sort(function(x,y){return Number(x.localId)-Number(y.localId);});
      var rank=same.map(function(x){return x.id;}).indexOf(ec.id)+1;
      function slug(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’.:]/g,'').replace(/&/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
      if(rank>0){direct='https://www.cardmarket.com/fr/Pokemon/Products/Singles/'+slug(es.name||(ec.set&&ec.set.name))+'/'+slug(ec.name)+(rank>1?'-V'+rank:'')+'-'+ab0+('000'+Number(c.localId)).slice(-3)+'?language=2';}
     }
    }
   }catch(e6){}
   return {doubt:doubt,direct:!!direct,url:direct||TK.cmUrl({name:c.name,number:c.localId,set_abbr:abbrMap[(c.set&&c.set.id)||'']},idp),idProduct:idp,price:price||foil,priceFoil:foil||price,updated:at?at.toISOString():new Date().toISOString(),image:c.image?c.image+'/high.webp':null,rarity:c.rarity||null,low:lowRarity(c.rarity,c.name),variants:out};
  }catch(e){return null;}
 }
};
})();
