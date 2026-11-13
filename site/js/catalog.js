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
TK.SEALED_KINDS=['Display','Booster','Coffret Dresseur d\'élite (ETB)','Tripack','Bundle de boosters','Coffret / Collection','Autre'];

/* ---------- liens d'achat neuf ---------- */
TK.buyLinks=function(it){
 var a=C.AFFILIATE||{},base=(it.name+' '+(it.set_name||'')).trim(),q=encodeURIComponent(base+' pokemon');
 var ebay='https://www.ebay.fr/sch/i.html?_nkw='+q+(a.ebay?'&'+String(a.ebay).replace(/^[?&]/,''):'');
 var amz='https://www.amazon.fr/s?k='+q+(a.amazon?'&tag='+encodeURIComponent(a.amazon):'');
 var cm='https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString='+encodeURIComponent(base);
 return [{label:'Cardmarket',url:cm,aff:false},{label:'eBay',url:ebay,aff:!!a.ebay},{label:'Amazon',url:amz,aff:!!a.amazon}];
};

/* ---------- catalogue TCGdex ---------- */
var API='https://api.tcgdex.net/v2/fr';
var setsCache=null,setIdx={};

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

TK.catalog={
 sets:async function(){
  if(setsCache){return setsCache;}
  try{
   var r=await fetch(API+'/sets');
   if(!r.ok){throw new Error('catalogue');}
   var j=await r.json();
   setsCache=j.map(function(s){return {id:s.id,name:s.name,logo:s.logo?s.logo+'.png':null,symbol:s.symbol?s.symbol+'.png':null,official:s.cardCount&&s.cardCount.official,total:s.cardCount&&s.cardCount.total};}).reverse();
  }catch(e){
   if(!TK.demo){throw new Error('Catalogue indisponible pour le moment. Réessaie dans un instant.');}
   setsCache=TK.DEMO_SETS.slice();
  }
  setsCache.forEach(function(s){setIdx[s.id]=s;});
  return setsCache;
 },
 /* Recherche par nom (et/ou série). Renvoie des fiches prêtes à choisir. */
 search:async function(q,setId){
  await TK.catalog.sets();
  var list=[];
  function demoList(){
   var nn=norm(q||'');
   return TK.DEMO_CARDS.filter(function(c){return c.type!=='sealed'&&(!nn||norm(c.name).indexOf(nn)>-1)&&(!setId||c.set_id===setId);}).map(function(c){
    return {card_id:c.card_id,name:c.name,number:c.number,set_id:c.set_id,set_name:c.set_name,image:null,val:c.val};
   });
  }
  if(!q&&!setId){return [];}
  if(setId&&setId.indexOf('demo-')===0){return demoList();}
  try{
   if(setId&&setIdx[setId]){
    var rs=await fetch(API+'/sets/'+encodeURIComponent(setId));
    if(!rs.ok){throw new Error('catalogue');}
    var set=await rs.json();
    list=(set.cards||[]).map(function(c){return {id:c.id,localId:c.localId,name:c.name,image:c.image,setId:setId};});
    if(q){var n=norm(q);list=list.filter(function(c){return norm(c.name).indexOf(n)>-1;});}
   }else if(q){
    var r=await fetch(API+'/cards?name='+encodeURIComponent(q));
    if(!r.ok){throw new Error('catalogue');}
    list=(await r.json()).map(function(c){var i=c.id.lastIndexOf('-');return {id:c.id,localId:c.localId,name:c.name,image:c.image,setId:c.id.slice(0,i)};});
   }
  }catch(e){
   if(!TK.demo){throw new Error('Catalogue indisponible pour le moment. Réessaie dans un instant.');}
   return demoList();
  }
  return list.slice(0,80).map(function(c){
   var s=setIdx[c.setId],off=s&&s.official;
   return {card_id:c.id,name:c.name,number:off?c.localId+'/'+off:String(c.localId),set_id:c.setId,set_name:s?s.name:c.setId,image:c.image?c.image+'/low.webp':null};
  });
 },
 /* Détail d'une carte : prix Cardmarket (EUR) et image haute définition. */
 detail:async function(cardId){
  try{
   var r=await fetch(API+'/cards/'+encodeURIComponent(cardId));
   if(!r.ok){return null;}
   var c=await r.json(),cm=(c.pricing&&c.pricing.cardmarket)||{};
   var price=cm.trend||cm.avg||cm['trend-holo']||cm['avg-holo']||null,at=null;
   if(cm.updated){at=typeof cm.updated==='number'?new Date(cm.updated<1e12?cm.updated*1000:cm.updated):new Date(cm.updated);if(isNaN(at)){at=null;}}
   return {price:price,updated:at?at.toISOString():new Date().toISOString(),image:c.image?c.image+'/high.webp':null,rarity:c.rarity||null};
  }catch(e){return null;}
 }
};
})();
