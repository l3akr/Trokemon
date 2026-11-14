/* Interface de Trokémon : écrans, navigation, actions. Aucun framework, tout est rendu en HTML par morceaux. */
(function(){
'use strict';
var TK=window.TK,DB=TK.db,C=window.TK_CONFIG||{};

var ENERGIES=[
 {id:'plante',name:'Plante',color:'#5CC27A',path:'M5 19C5 9 11 5 19 5c0 8-4 14-14 14zM5 19l8-8'},
 {id:'feu',name:'Feu',color:'#F0714A',path:'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z'},
 {id:'eau',name:'Eau',color:'#4DA8F2',path:'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'},
 {id:'electrique',name:'Électrique',color:'#F5C842',path:'M13 3L5 13h6l-1 8 8-10h-6z'},
 {id:'psy',name:'Psy',color:'#C08DF7',path:'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'},
 {id:'combat',name:'Combat',color:'#D98A52',path:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z'},
 {id:'obscurite',name:'Obscurité',color:'#8E82B0',path:'M15 4a8 8 0 1 0 5 12A7 7 0 0 1 15 4z'},
 {id:'metal',name:'Métal',color:'#A9B6C3',path:'M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z'},
 {id:'dragon',name:'Dragon',color:'#D3A94A',path:'M12 3l8 9-8 9-8-9z'},
 {id:'incolore',name:'Incolore',color:'#DCD8E2',path:'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z'}
];
var CONDITIONS=[['Mint','Mint (neuve)'],['Near Mint','Near Mint'],['Excellent','Excellent'],['Good','Bon état'],['Played','Jouée']];
var COMPANIES=['PSA','BGS','CGC','SGC','PCA','Autre'];
var STATUS={sent:'Envoyée',accepted:'Acceptée',declined:'Refusée',cancelled:'Annulée',done:'Échange effectué'};

var S={
 phase:'boot',err:'',notice:null,form:{pseudo:'',email:''},recover:false,
 user:null,energy:null,tab:'carte',stack:[],
 my:{offers:[],wants:[]},listTab:'offers',sets:null,
 mv:{lat:46.6,lng:2.4,z:6},mode:'tous',mapProfiles:[],mapIdx:{},selected:null,mapTok:0,geo:null,
 sugg:[],cardSugg:[],itemFilter:null,open:{},zoneQ:'',zoneRes:[],zonePick:null,
 myStats:null,myReviews:[],rev:null,add:null,props:[],msgs:[],sheet:null,light:null,poll:0,lastKey:''
};

/* ---------- utilitaires ---------- */
function $(s,r){return (r||document).querySelector(s);}
function esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function hexA(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
function debounce(fn,ms){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a);},ms);};}
function ico(p,size,col){return '<svg aria-hidden="true" width="'+(size||22)+'" height="'+(size||22)+'" viewBox="0 0 24 24" fill="none" stroke="'+(col||'currentColor')+'" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="'+p+'"/></svg>';}
var I={
 map:'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
 cards:'M3 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 4h10a3 3 0 0 1 3 3v10',
 swap:'M7 7h13l-3-3M17 17H4l3 3',user:'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
 back:'M15 5l-7 7 7 7',check:'M5 12.5l4.5 4.5L19 7.5',trash:'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
 close:'M6 6l12 12M18 6L6 18',plus:'M12 5v14M5 12h14',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
 locate:'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
 camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z'
};
function eur(v){return v==null?'indisponible':'≈ '+Number(v).toLocaleString('fr-FR',{maximumFractionDigits:2})+' €';}
function label(it){return esc(it.name)+(it.number?' ('+(it.set_abbr?esc(it.set_abbr)+' - ':'')+esc(it.number)+')':'');}
function labelBr(it){return esc(it.name)+(it.number?'<span class="lref">('+(it.set_abbr?esc(it.set_abbr)+' - ':'')+esc(it.number)+')</span>':'');}
function when(iso){if(!iso){return '';}var d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function km(a,b){
 var R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
 var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
 return 2*R*Math.asin(Math.sqrt(h));
}
function myPos(){
 if(S.user&&S.user.zone_lat!=null){return {lat:S.user.zone_lat,lng:S.user.zone_lng};}
 return S.geo;
}
function dist(p){
 var m=myPos();if(!m||p.zone_lat==null){return '';}
 var d=km(m,{lat:p.zone_lat,lng:p.zone_lng});
 return d<1.5?'≈ 1 km':d<50?'≈ '+Math.round(d)+' km':'≈ '+(Math.round(d/10)*10)+' km';
}
function applyTheme(){
 var e=energyObj(),r=document.documentElement.style;
 r.setProperty('--accent',e.color);r.setProperty('--accent-soft',hexA(e.color,0.16));r.setProperty('--glow',hexA(e.color,0.1));r.setProperty('--glow2',hexA(e.color,0.05));
 var svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g fill="none" stroke="'+e.color+'" stroke-width=".08" stroke-linejoin="round" stroke-linecap="round" opacity=".5"><path d="'+e.path+'" transform="scale(4.6) translate(.4 .4)"/></g></svg>';
 r.setProperty('--tile','url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');
 var d=document.getElementById('decor');if(d){d.setAttribute('data-e',e.id);}
 var tc=document.querySelector('meta[name=theme-color]');if(tc){tc.setAttribute('content','#0E0F11');}
}
/* Logo : deux cartes qui s'échangent. */
function logoMark(sz){
 return '<svg class="lmark" width="'+sz+'" height="'+sz+'" viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="6" width="15" height="21" rx="3.2" transform="rotate(-12 11 16.5)" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="5" width="15" height="21" rx="3.2" transform="rotate(9 20.5 15.5)" fill="currentColor"/><path d="M17.5 12.2h7l-1.8-1.8M24.5 18.6h-7l1.8 1.8" transform="rotate(9 20.5 15.5)" fill="none" stroke="#0A130C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function wordmark(sz){return logoMark(sz||26)+'<span class="wtxt">TROKÉMON</span>';}
function energyObj(){return ENERGIES.filter(function(x){return x.id===S.energy;})[0]||ENERGIES[3];}
var toastTimer=0;
function toast(t){var el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true;},3000);}
function phColor(s){var h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))%360;}return 'hsl('+h+' 28% 22%)';}
function cardImg(it){
 var src=it.photo_front||it.catalog_image;
 return src?'<img class="cimg" loading="lazy" alt="" data-n="'+esc(it.name)+'" onerror="TK_imgFallback(this)" src="'+esc(src)+'">':'<span class="cph" aria-hidden="true" style="background:'+phColor(it.name)+'">'+esc(it.name.charAt(0))+'</span>';
}
var PRESETS=[
 ['#F5C842','#2B2410','M50 22l8 20 22 2-17 14 6 22-19-12-19 12 6-22-17-14 22-2z'],
 ['#4FA3E3','#0E2A40','M50 18C50 18 28 44 28 60a22 22 0 0 0 44 0C72 44 50 18 50 18z'],
 ['#E8603C','#3A140A','M50 16c4 14 22 22 22 42a22 22 0 0 1-44 0c0-10 6-14 10-20 2 8 6 10 8 8-2-12 0-22 4-30z'],
 ['#5CB85C','#10300F','M24 70C24 40 44 24 76 24 76 56 56 76 24 70z'],
 ['#A66BD6','#26103A','M50 20a30 30 0 1 0 0 60 22 22 0 0 1 0-60z'],
 ['#8A8F98','#1B1D21','M22 62l28-40 28 40-28 16z'],
 ['#E86FA8','#3A1026','M50 78C20 56 22 30 38 30c8 0 12 6 12 10 0-4 4-10 12-10 16 0 18 26-12 48z'],
 ['#3FC1B0','#0A2F2A','M24 50a26 26 0 0 1 52 0M24 50a26 26 0 0 0 52 0M50 24v52']
];
function presetIdx(u){var m=/^preset:(\d+)$/.exec(u||'');return m&&PRESETS[+m[1]]?+m[1]:-1;}
function presetSvg(n,sz,st){
 var d=PRESETS[n];
 return '<svg class="av" viewBox="0 0 100 100" width="'+sz+'" height="'+sz+'" style="'+st+'" aria-hidden="true"><rect width="100" height="100" fill="'+d[0]+'"/><circle cx="82" cy="18" r="30" fill="#fff" opacity=".14"/><path d="'+d[2]+'" fill="'+(n===7?'none':d[1])+'" stroke="'+d[1]+'" stroke-width="'+(n===7?7:0)+'" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function presetGrid(action){
 var cur=presetIdx(S.user&&S.user.avatar_url);
 return '<div class="pgrid">'+PRESETS.map(function(d,i){return '<button class="pbtn" data-a="'+action+'" data-v="'+i+'" aria-label="Avatar '+(i+1)+'" aria-pressed="'+(cur===i)+'">'+presetSvg(i,56,'width:100%;height:100%')+'</button>';}).join('')+'</div>';
}
function avatar(p,sz,ring){
 var st='width:'+sz+'px;height:'+sz+'px;'+(ring?'box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--accent);':'');
 if(p&&presetIdx(p.avatar_url)>=0){return presetSvg(presetIdx(p.avatar_url),sz,st);}
 if(p&&p.avatar_url){return '<img class="av" src="'+esc(p.avatar_url)+'" alt="" style="'+st+'">';}
 return '<span class="av ph" aria-hidden="true" style="'+st+'font-size:'+Math.round(sz/2.4)+'px">'+esc(((p&&p.pseudo)||'?').charAt(0).toUpperCase())+'</span>';
}
function typeChip(it){
 if(it.type==='graded'){return '<span class="chip acc">'+esc((it.grade_company||'')+' '+(it.grade||'gradée')).trim()+'</span>';}
 if(it.type==='sealed'){return '<span class="chip">Scellé</span>';}
 return '<span class="chip">'+esc(it.condition||'Loose')+'</span>';
}
function keysOf(list){var o={};list.forEach(function(i){o[i.match_key]=1;});return o;}
function matchFor(items){
 var mw=keysOf(S.my.wants),mo=keysOf(S.my.offers);
 return {
  gets:items.filter(function(i){return i.kind==='offer'&&mw[i.match_key];}),
  gives:items.filter(function(i){return i.kind==='want'&&mo[i.match_key];})
 };
}
function stars(avg,sz){
 var n=Math.round(avg||0),h='';for(var i=1;i<=5;i++){h+='<span style="color:'+(i<=n?'var(--accent)':'var(--line,#3a4150)')+'">★</span>';}
 return '<span class="stars" style="font-size:'+(sz||14)+'px;letter-spacing:1px" role="img" aria-label="'+(avg==null?'Pas de note':String(avg).replace('.',',')+' sur 5')+'">'+h+'</span>';
}
function statsLine(st){
 if(!st){return '';}
 var plural=function(n,a,b){return n+' '+(n>1?b:a);};
 return (st.count?stars(st.avg)+' <b>'+String(st.avg).replace('.',',')+'</b> <span class="muted">('+plural(st.count,'avis','avis')+')</span>':'<span class="muted">Pas encore d\'avis</span>')+
  ' <span class="muted">· '+plural(st.done,'échange effectué','échanges effectués')+'</span>';
}
function reviewList(list){
 if(!list||!list.length){return '<p class="muted" style="padding:20px 0">Aucun avis pour l\'instant.</p>';}
 return list.map(function(r){var w=r.who||{};
  return '<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;gap:10px">'+avatar(w,32)+'<div class="grow"><div class="name" style="font-size:14px">'+esc(w.pseudo||'Membre')+'</div><div class="muted" style="font-size:12px">'+when(r.created_at)+'</div></div>'+stars(r.rating)+'</div>'+
  (r.comment?'<p style="margin:8px 0 0 0;font-size:14px">'+esc(r.comment)+'</p>':'')+'</div>';
 }).join('');
}
function parseEur(v){var n=parseFloat(String(v||'').replace(/\s/g,'').replace(',','.'));return isFinite(n)&&n>0&&n<1e7?Math.round(n*100)/100:0;}
function sumVal(list){return list.reduce(function(t,i){return t+(Number(i.value_eur)||0);},0);}

/* ---------- navigation ---------- */
function top(){return S.stack.length?S.stack[S.stack.length-1]:null;}
function nav(v){
 v._h=false;
 try{history.pushState({d:S.stack.length+1},'');v._h=true;}catch(e){}
 S.stack.push(v);render();
}
window.addEventListener('popstate',function(){if(S.stack.length){S.stack.pop();render();}});

/* ---------- vues d'entrée ---------- */
function onav(extra){return '<header class="onav"><button class="wordmark" data-a="goto" data-v="landing" aria-label="Accueil">'+wordmark(26)+'</button>'+(extra||'')+'</header>';}
function vBoot(){return '<div class="outer center"><div class="wordmark bootmark">'+wordmark(44)+'</div><p class="muted">Chargement…</p></div>';}
function vFatal(){
 return '<div class="outer">'+onav('')+'<div class="authwrap"><h1>Un souci est survenu</h1><p class="err" role="alert">'+esc(S.err)+'</p><button class="btn" data-a="logout">Revenir à l\'accueil</button></div></div>';
}
function vNotice(){
 var n=S.notice||{};
 return '<div class="outer">'+onav('')+'<div class="authwrap"><h1>'+esc(n.title)+'</h1><p class="muted" style="margin:8px 0 20px 0">'+esc(n.text)+'</p><button class="btn primary" data-a="goto" data-v="login">Aller à la connexion</button></div></div>';
}
function loadShowcase(){
 if(S.showcase!==undefined){return;}
 S.showcase=null;
 try{DB.showcase().then(function(l){S.showcase=l||[];if(S.phase==='landing'){render();}}).catch(function(){S.showcase=[];});}catch(e){S.showcase=[];}
}
function showcaseCard(it){
 return '<div class="stile"><div class="simg">'+(it.image?'<img class="cimg" loading="lazy" alt="" data-n="'+esc(it.name)+'" onerror="TK_imgFallback(this)" src="'+esc(it.image)+'">':'<span class="cph" style="background:'+phColor(it.name)+'">'+esc(it.name.charAt(0))+'</span>')+'</div><div class="name" style="font-size:13px;margin-top:6px">'+label(it)+'</div><div class="muted" style="font-size:12px">'+esc(it.zone_label||'')+(it.variant?' · '+esc(it.variant):'')+'</div></div>';
}
function vLanding(){
 loadShowcase();
 var sc=S.showcase||[],first=sc[0];
 var dcard=first?'<div class="democard"><div style="display:flex;justify-content:space-between;align-items:center"><span class="name">Zone '+esc(first.zone_label||'')+'</span><span class="chip acc">À l\'échange</span></div><div class="muted" style="margin-top:4px">Propose '+label(first)+(first.variant?' · '+esc(first.variant):'')+'</div></div>'
  :TK.demo?'<div class="democard"><div style="display:flex;justify-content:space-between;align-items:center"><span class="name">Lune_47 · ≈ 2 km</span><span class="chip acc">Mutuel</span></div><div class="muted" style="margin-top:4px">Propose Lucario (102/96) · cherche Pikachu PSA 9</div></div>'
  :'<div class="democard"><div class="name">Sois le premier !</div><div class="muted" style="margin-top:4px">Crée ton compte et propose une carte près de chez toi.</div></div>';
 var fan=sc.length?'<div class="fan">'+sc.slice(0,3).map(function(it,i){return '<div class="fc fc'+i+'">'+(it.image?'<img alt="" data-n="'+esc(it.name)+'" onerror="TK_imgFallback(this)" src="'+esc(it.image)+'">':'')+'</div>';}).join('')+'</div>':'';
 var strip=sc.length?'<section class="strip" aria-label="Cartes à l\'échange en ce moment"><h2 class="name" style="font-size:18px;margin:0 0 10px 0">À l\'échange en ce moment</h2><div class="srow2">'+sc.map(showcaseCard).join('')+'</div></section>':'';
 return '<div class="outer">'+onav('<button class="btn sm ghost" data-a="goto" data-v="login">Se connecter</button>')+
 '<section class="hero"><div><h1>Échanger du <span class="hl">TCG</span> n\'a jamais été aussi simple</h1>'+
 '<p class="lead">Repère autour de toi les cartes que tu cherches, propose celles que tu as et échange en main propre. Gratuit, sans abonnement.</p>'+
 '<div class="ctas"><button class="btn primary" data-a="goto" data-v="signup">Créer un compte</button><button class="btn" data-a="goto" data-v="login">Se connecter</button></div>'+
 (TK.demo?'<p class="note" style="margin-top:14px">Mode démo : données fictives, rien n\'est enregistré.</p>':'<p class="note" style="margin-top:14px">Version bêta. Merci de signaler les bugs !</p>')+'</div>'+
 '<div class="demo" aria-hidden="true"><svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none" style="position:absolute;inset:0"><path d="M-10 90L410 60M-10 190L410 160M-10 270L410 250" stroke="#1E2227" stroke-width="10" fill="none"/><path d="M90 -10L120 310M220 -10L200 310M330 -10L350 310" stroke="#1E2227" stroke-width="7" fill="none"/></svg>'+
 '<span class="z" style="left:28%;top:30%;width:84px;height:84px"></span><span class="z" style="left:68%;top:24%;width:64px;height:64px"></span><span class="z" style="left:56%;top:56%;width:96px;height:96px;background:var(--accent);opacity:.35"></span><span class="z" style="left:16%;top:64%;width:56px;height:56px"></span>'+
 ''+fan+dcard+'</div></section>'+
 strip+'<section class="feats" aria-label="Fonctionnement">'+
 [['Une carte des échanges','Vois ce que les gens proposent ou cherchent autour de toi, en zones approximatives.'],['Des cartes bien identifiées','Numéro de carte, photos recto et verso, état ou grade, estimation du moment.'],['En main propre','Rendez-vous en boutique partenaire ou lieu public. Rien ne passe par nous.']].map(function(f){return '<div class="card"><h3>'+f[0]+'</h3><div class="muted">'+f[1]+'</div></div>';}).join('')+'</section>'+
 '<footer class="ofoot note">Projet indépendant, non affilié à Nintendo, Creatures, GAME FREAK ni The Pokémon Company. Pokémon est une marque de ses propriétaires.<br><a href="legal.html#mentions">Mentions légales</a> · <a href="legal.html#confidentialite">Confidentialité</a> · <a href="legal.html#cgu">Conditions</a></footer></div>';
}
function field(id,lbl,type,ph,val,ac){
 return '<div style="margin-bottom:14px"><label class="muted" for="'+id+'">'+lbl+'</label><input id="'+id+'" name="'+id+'" class="field" type="'+type+'" placeholder="'+ph+'" value="'+esc(val||'')+'" autocomplete="'+ac+'"></div>';
}
function vAuth(){
 var p=S.phase,signup=p==='signup',forgot=p==='forgot',rec=p==='recover';
 var title=signup?'Créer un compte':forgot?'Mot de passe oublié':rec?'Nouveau mot de passe':'Se connecter';
 var sub=signup?'Gratuit, sans abonnement.':forgot?'Entre ton email, on t\'envoie un lien pour choisir un nouveau mot de passe.':rec?'Choisis un nouveau mot de passe.':'Content de te revoir.';
 var btn=signup?'Créer mon compte':forgot?'Envoyer le lien':rec?'Enregistrer':'Me connecter';
 return '<div class="outer">'+onav('')+'<div class="authwrap">'+(signup?'<div class="steps">Étape 1 sur 4</div>':'')+
 '<h1>'+title+'</h1><p class="muted" style="margin:0 0 20px 0">'+sub+'</p>'+
 '<form id="authform" novalidate>'+(S.err?'<p class="err" role="alert">'+esc(S.err)+'</p>':'')+
 (signup?field('pseudo','Pseudo (3 à 20 caractères, sans espace)','text','Ton pseudo',S.form.pseudo,'username'):'')+
 (rec?'':field('email','Email','email','toi@exemple.fr',S.form.email,'email'))+
 (forgot?'':field('password',rec?'Nouveau mot de passe':'Mot de passe','password',signup||rec?'8 caractères minimum':'Ton mot de passe','',signup||rec?'new-password':'current-password'))+
 '<button class="btn primary" type="submit" style="margin-top:6px">'+btn+'</button>'+(signup?'<p class="note" style="margin-top:10px">En créant un compte, tu acceptes les <a href="legal.html#cgu" target="_blank" rel="noopener">conditions d\'utilisation</a> et la <a href="legal.html#confidentialite" target="_blank" rel="noopener">politique de confidentialité</a>. Tu as 15 ans ou plus.</p>':'')+'</form>'+
 (p==='login'?'<p style="margin-top:14px;text-align:center"><button class="btn sm ghost" style="color:var(--muted)" data-a="goto" data-v="forgot">Mot de passe oublié ?</button></p>':'')+
 (TK.demo&&!rec?'<p class="note" style="margin-top:12px">Mode démo : rien n\'est envoyé, n\'importe quelles valeurs valides conviennent.</p>':'')+
 (rec?'':'<p style="margin-top:16px;text-align:center" class="muted">'+(signup?'Déjà un compte ?':'Pas encore de compte ?')+' <button class="btn sm ghost" style="color:var(--accent)" data-a="goto" data-v="'+(signup?'login':'signup')+'">'+(signup?'Se connecter':'Créer un compte')+'</button></p>')+
 '</div></div>';
}
function vPhoto(){
 var has=!!S.user.avatar_url;
 return '<div class="outer">'+onav('')+'<div class="authwrap" style="text-align:center"><div class="steps">Étape 2 sur 4</div><h1>Ajoute une photo de profil</h1>'+
 '<p class="muted" style="margin:0 0 24px 0">Elle apparaît sur ton profil auprès des autres dresseurs. Tu pourras la changer plus tard.</p>'+
 '<div style="padding:8px 0 0 0;display:flex;justify-content:center;margin-bottom:20px">'+avatar(S.user,136,true)+'</div>'+
 '<div class="muted" style="margin-bottom:8px">Choisis un avatar</div>'+presetGrid('setpreset')+
 '<input type="file" accept="image/*" id="photofile" hidden>'+
 '<button class="btn" data-a="pickphoto" style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px">'+ico(I.camera,20)+'Ou envoyer ma propre photo</button>'+
 '<button class="btn primary" style="margin-top:10px" data-a="photonext">'+(has?'Continuer':'Passer (avatar au hasard)')+'</button></div></div>';
}
function energyTiles(){
 return '<div class="egrid">'+ENERGIES.map(function(e){
  return '<button class="etile" data-a="energy" data-v="'+e.id+'" aria-pressed="'+(S.energy===e.id)+'"><span class="dot" style="background:'+e.color+'">'+ico(e.path,20,'#0A0B0D')+'</span>'+e.name+'</button>';
 }).join('')+'</div>';
}
function vEnergy(){
 return '<div class="outer">'+onav('<button class="btn sm ghost" data-a="goto" data-v="photo">‹ Retour</button>')+'<div class="authwrap" style="max-width:640px;text-align:center"><div class="steps">Étape 3 sur 4</div><h1>Choisis ton énergie</h1>'+
 '<p class="muted" style="margin:0 0 20px 0">Elle donne sa couleur à ton profil et à ta zone sur la carte. Tu pourras la changer plus tard.</p>'+
 '<div style="padding:8px 0 0 0;display:flex;justify-content:center;margin-bottom:24px">'+avatar(S.user,88,true)+'</div>'+energyTiles()+
 '<button class="btn primary" style="margin-top:20px" data-a="saveenergy">Continuer</button></div></div>';
}
function zoneHint(q,res){
 q=String(q||'').trim();if(!q||res.length){return '';}
 if(/^\d{1,4}$/.test(q)&&q.length>=2&&q.length<5){return /^\d{2,3}$/.test(q)?'Aucun département pour ce numéro.':'Entre les 5 chiffres du code postal.';}
 return 'Aucun résultat. Essaie le nom de la commune, son code postal à 5 chiffres, ou le département.';
}
function zoneResHtml(){
 return S.zoneRes.map(function(p,i){return '<button data-a="zonepick" data-v="'+i+'"><span>'+esc(p.n)+'</span><span class="chip">'+p.k+'</span></button>';}).join('');
}
function zonePicker(){
 return '<button class="btn" data-a="geoloc" style="display:flex;align-items:center;justify-content:center;gap:8px">'+ico(I.locate,20)+'Utiliser ma position</button>'+
 '<div style="margin:14px 0 6px 0"><label class="muted" for="zq">Ou cherche ta ville</label><input id="zq" class="field" type="search" placeholder="Ville, code postal ou département" autocomplete="off" value="'+esc(S.zoneQ)+'"></div>'+
 '<div id="zres" class="sugg" '+(S.zoneRes.length?'':'hidden')+'>'+zoneResHtml()+'</div><div id="zhint" class="note" style="margin-top:6px" aria-live="polite">'+zoneHint(S.zoneQ,S.zoneRes)+'</div>'+
 (S.zonePick?'<div class="card" style="margin-top:12px;border-color:var(--accent)"><div class="muted">Zone choisie</div><div class="name">'+esc(S.zonePick.label)+'</div></div>':'')+
 '<p class="note" style="margin-top:12px">Seule une zone approximative (environ 2 km) est visible par les autres, jamais ton adresse.</p>';
}
function vZone(){
 return '<div class="outer">'+onav('<button class="btn sm ghost" data-a="goto" data-v="energy">‹ Retour</button>')+'<div class="authwrap"><div class="steps">Étape 4 sur 4</div><h1>Où échanges-tu ?</h1>'+
 '<p class="muted" style="margin:0 0 20px 0">Pour apparaître sur la carte et voir les échanges autour de toi.</p>'+zonePicker()+
 '<button class="btn primary" style="margin-top:16px" data-a="savezone"'+(S.zonePick?'':' disabled')+'>Terminer</button>'+
 '<button class="btn ghost" style="margin-top:6px" data-a="skipzone">Plus tard</button></div></div>';
}

/* ---------- coque de l'application ---------- */
function navItems(){return [['carte','Carte',I.map],['listes','Mes cartes',I.cards],['echanges','Échanges',I.swap],['profil','Profil',I.user]];}
function tabbar(){
 return '<nav class="tabbar" aria-label="Navigation principale">'+navItems().map(function(t){
  return '<button data-a="tab" data-v="'+t[0]+'"'+(S.tab===t[0]?' aria-current="page"':'')+'>'+ico(t[2])+'<span>'+t[1]+'</span></button>';
 }).join('')+'</nav>';
}
function side(){
 return '<aside class="side" aria-label="Navigation principale"><div class="wordmark" style="padding:8px 12px 20px 12px">'+wordmark(28)+'</div>'+
 navItems().map(function(t){return '<button class="sidebtn" data-a="tab" data-v="'+t[0]+'"'+(S.tab===t[0]?' aria-current="page"':'')+'>'+ico(t[2])+'<span>'+t[1]+'</span></button>';}).join('')+
 '<div class="grow"></div><div class="me">'+avatar(S.user,40)+'<div class="grow"><div class="name">'+esc(S.user.pseudo)+'</div><div class="muted">'+(S.energy?'Énergie '+energyObj().name:'Énergie à choisir')+'</div></div></div></aside>';
}
function page(inner){return '<div class="pg">'+inner+'</div>';}
function header(title,sub,back){
 return '<div class="top">'+(back?'<button class="icon-btn" data-a="back" aria-label="Retour">'+ico(I.back)+'</button>':'<span style="width:8px"></span>')+'<div><h1>'+title+'</h1>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div></div>';
}
function loading(t){return page(header(t||'Chargement',null,true)+'<div class="scroll"><p class="muted" style="padding:24px 0">Chargement…</p></div>');}

/* ---------- carte ---------- */
function vCarte(){
 var modes=[['tous','Tous'],['proposent','Proposent'],['cherchent','Cherchent'],['mutuel','Mutuel']];
 return '<div class="mapview"><div class="mappane"><div id="lmap" role="application" aria-label="Carte des échanges. La liste des profils visibles est à côté."></div>'+
 '<div class="msearch"><div class="srow"><div class="sbox">'+ico(I.search,18)+'<input id="msearch" type="search" placeholder="Ville, code postal, carte ou n°" aria-label="Rechercher un lieu, une carte ou un numéro de carte" autocomplete="off"></div>'+
 '<button class="locbtn" data-a="locate">'+ico(I.locate,18)+'<span>Autour de moi</span></button></div><div id="sugg" class="sugg" hidden></div><div id="fchip">'+filterChipHtml()+'</div></div>'+
 '<div id="preview" class="preview"></div>'+mapSliders()+'</div>'+
 '<div class="listpane"><div class="listhead"><div class="seg" role="group" aria-label="Mode">'+modes.map(function(m){return '<button data-a="mode" data-v="'+m[0]+'" aria-pressed="'+(S.mode===m[0])+'">'+m[1]+'</button>';}).join('')+'</div><div class="name" id="pcount" style="margin-top:10px"></div></div><div id="plist"></div></div></div>';
}
function radiusLabel(v){return '≈ '+(v>=1000?Math.round(v/10)*10:v)+' km';}
function mapSliders(){
 var z=(S.mv&&S.mv.z)||6;
 return '<div class="msliders"><label><span>Zone de recherche <b id="rlabel">'+radiusLabel(S.radius||0)+'</b></span><input id="zslider" type="range" min="4" max="16" step="0.5" value="'+z+'" aria-label="Taille de la zone de recherche : à gauche zone large et carte dézoomée, à droite zone réduite et carte zoomée"><span class="srange"><span>Large</span><span>Précise</span></span></label></div>';
}
function filterChipHtml(){
 var f=S.itemFilter;if(!f){return '';}
 return '<div class="fchip"><span>Filtre : <b>'+esc(f.label)+'</b> · '+f.profiles.length+' profil'+(f.profiles.length>1?'s':'')+'</span><button data-a="clearfilter" aria-label="Retirer le filtre">✕</button></div>';
}
function setItemFilter(f){
 S.itemFilter=f;S.selected=null;
 var c=$('#fchip');if(c){c.innerHTML=filterChipHtml();}
 if(f){S.mapProfiles=f.profiles;S.mapIdx={};f.items.forEach(function(i){(S.mapIdx[i.user_id]=S.mapIdx[i.user_id]||[]).push(i);});syncMap();TK.map.fit(f.profiles.map(function(p){return [p.zone_lat,p.zone_lng];}));}
 else{S.mapProfiles=[];S.mapIdx={};syncMap();loadMapData(TK.map.bounds());}
}
function cardGroups(items){
 var g={},order=[];
 items.forEach(function(i){
  var k=i.match_key||('n:'+TK.norm(i.name)+'|'+(i.number||''));
  if(!g[k]){g[k]={key:k,sample:i,items:[],offers:0,wants:0};order.push(k);}
  g[k].items.push(i);if(i.kind==='offer'){g[k].offers++;}else{g[k].wants++;}
 });
 return order.map(function(k){return g[k];}).sort(function(a,b){return b.items.length-a.items.length;});
}
function mapEntries(){
 return S.mapProfiles.map(function(p){
  var items=S.mapIdx[p.id]||[],m=matchFor(items);
  return {p:p,items:items,m:m,mutual:!S.itemFilter&&m.gets.length>0&&m.gives.length>0};
 }).filter(function(e){
  if(S.itemFilter){
   if(S.mode==='proposent'){return e.items.some(function(i){return i.kind==='offer';});}
   if(S.mode==='cherchent'){return e.items.some(function(i){return i.kind==='want';});}
   return true;
  }
  if(S.mode==='proposent'){return e.m.gets.length>0;}
  if(S.mode==='cherchent'){return e.m.gives.length>0;}
  if(S.mode==='mutuel'){return e.mutual;}
  return true;
 }).filter(function(e){
  if(!S.radius||!S.mv||S.itemFilter){return true;}
  return km({lat:S.mv.lat,lng:S.mv.lng},{lat:e.p.zone_lat,lng:e.p.zone_lng})<=S.radius;
 });
}
function profRow(e){
 var p=e.p,line=[];
 if(S.itemFilter){
  e.items.slice(0,2).forEach(function(i){line.push((i.kind==='offer'?'Propose ':'Cherche ')+label(i));});
  if(e.items.length>2){line.push('+'+(e.items.length-2));}
 }else if(e.m.gets.length){line.push('Propose '+label(e.m.gets[0])+(e.m.gets.length>1?' +'+(e.m.gets.length-1):''));}
 if(!S.itemFilter&&e.m.gives.length){line.push('cherche '+label(e.m.gives[0]));}
 if(!line.length){
  var o=e.items.filter(function(i){return i.kind==='offer';}).length;
  line.push(o+' à proposer · '+(e.items.length-o)+' recherchés');
 }
 return '<button class="row mrow'+(S.selected===p.id?' sel':'')+'" data-a="profile" data-v="'+esc(p.id)+'">'+avatar(p,44)+'<span class="grow"><span class="name" style="display:block">'+esc(p.pseudo)+'</span><span class="muted" style="display:block">Zone '+esc(p.zone_label||'')+(dist(p)?' · '+dist(p):'')+'</span><span style="display:block;font-size:13px;margin-top:2px">'+line.join(', ')+'</span></span>'+(e.mutual?'<span class="chip acc">Mutuel</span>':'')+'</button>';
}
function updateList(es){
 var el=$('#plist');if(!el){return;}
 var c=TK.map.center()||{lat:S.mv.lat,lng:S.mv.lng};
 var list=S.itemFilter?es.slice():es.filter(function(e){return TK.map.contains(e.p.zone_lat,e.p.zone_lng);});
 list.sort(function(a,b){return km(c,{lat:a.p.zone_lat,lng:a.p.zone_lng})-km(c,{lat:b.p.zone_lat,lng:b.p.zone_lng});});
 $('#pcount').textContent=list.length+' profil'+(list.length>1?'s':'')+(S.itemFilter?' avec « '+S.itemFilter.label+' »':' dans cette zone');
 el.innerHTML=list.length?list.slice(0,40).map(profRow).join(''):'<p class="muted" style="padding:16px 0">Aucun profil ici pour le moment. Zoome sur une grande ville, cherche un autre lieu ou change de mode.</p>';
}
function updatePreview(es){
 var el=$('#preview');if(!el){return;}
 var e=S.selected&&es.filter(function(x){return x.p.id===S.selected;})[0];
 if(!e){el.innerHTML='';return;}
 el.innerHTML='<div class="pv">'+avatar(e.p,40)+'<div class="grow"><div class="name">'+esc(e.p.pseudo)+'</div><div class="muted">Zone '+esc(e.p.zone_label||'')+(dist(e.p)?' · '+dist(e.p):'')+(e.mutual?' · Mutuel':'')+'</div></div><button class="btn primary sm" data-a="profile" data-v="'+esc(e.p.id)+'">Voir</button></div>';
}
function syncMap(){
 var es=mapEntries();
 TK.map.setEntries(es.map(function(e){return {id:e.p.id,letter:esc(e.p.pseudo.charAt(0).toUpperCase()),inner:avatar(e.p,30),lat:e.p.zone_lat,lng:e.p.zone_lng,mutual:e.mutual,title:e.p.pseudo};}),S.selected);
 updateList(es);updatePreview(es);
}
async function loadMapData(b){
 if(!b||S.itemFilter){return;}
 var tok=++S.mapTok;
 try{
  var d=await DB.mapData(b);try{await TK.catalog.enrich(d.items);}catch(e){}
  if(tok!==S.mapTok||!$('#lmap')){return;}
  S.mapProfiles=d.profiles;S.mapIdx={};
  d.items.forEach(function(i){(S.mapIdx[i.user_id]=S.mapIdx[i.user_id]||[]).push(i);});
  syncMap();
 }catch(e){toast(TK.frError(e));}
}
function mountMap(){
 TK.map.mount($('#lmap'),{
  center:[S.mv.lat,S.mv.lng],zoom:S.mv.z,
  onSelect:function(id){S.selected=id;syncMap();},
  onMove:function(b,c,z){S.mv={lat:c.lat,lng:c.lng,z:z};S.radius=TK.map.radiusKm();var rl=$('#rlabel');if(rl){rl.textContent=radiusLabel(S.radius);}loadMapData(b);syncMap();},
  onZoom:function(z){var zs=$('#zslider');if(zs&&document.activeElement!==zs){zs.value=z;}var rl=$('#rlabel');if(rl){rl.textContent=radiusLabel(TK.map.radiusKm());}}
 });
 var me=S.geo||(S.user&&S.user.zone_lat!=null?{lat:S.user.zone_lat,lng:S.user.zone_lng}:null);
 TK.map.setMe(me);
 syncMap();
}
function showSugg(){
 var el=$('#sugg');if(!el){return;}
 if(!S.sugg.length&&!S.cardSugg.length){el.hidden=true;el.innerHTML='';return;}
 var h='';
 if(S.sugg.length){h+='<div class="sh">Lieux</div>'+S.sugg.map(function(p,i){return '<button data-a="place" data-v="'+i+'"><span>'+esc(p.n)+'</span><span class="chip">'+esc(p.k)+'</span></button>';}).join('');}
 if(S.cardSugg.length){h+='<div class="sh">Cartes sur la carte</div>'+S.cardSugg.map(function(g,i){
  var sm=g.sample,info=(g.offers?g.offers+' propose'+(g.offers>1?'nt':''):'')+(g.offers&&g.wants?' · ':'')+(g.wants?g.wants+' cherche'+(g.wants>1?'nt':''):'');
  return '<button data-a="cardsel" data-v="'+i+'"><span>'+(g.all?'Tous les résultats pour « '+esc(g.q)+' »':label(sm)+'<span class="muted" style="display:block;font-size:12px">'+esc(sm.set_name||'')+'</span>')+'</span><span class="chip">'+(g.all?g.items.length+' items':info)+'</span></button>';
 }).join('');}
 el.innerHTML=h;el.hidden=false;
}

/* ---------- pages : mes cartes, détail, profil d'un autre ---------- */
function setLogo(m){
 if(!m||!(m.logo||m.symbol)){return '';}
 return '<img class="slogo" src="'+esc(m.logo||m.symbol)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
}
function setGroups(list,key,rowFn){
 var cnt=function(arr){return arr.reduce(function(t,i){return t+(i._n||1);},0);};
 var g={},names=[];
 list=list.slice().sort(function(a,b){var x=parseInt(String(a.number||'').split('/')[0],10),y=parseInt(String(b.number||'').split('/')[0],10);if(isNaN(x)&&isNaN(y)){return String(a.name).localeCompare(String(b.name),'fr');}if(isNaN(x)){return 1;}if(isNaN(y)){return -1;}return x-y||String(a.name).localeCompare(String(b.name),'fr');});
 /* exemplaires identiques (même carte, version, état, sans photos propres) : une seule ligne ×N */
 var seen={},merged=[];
 list.forEach(function(i){
  if(i.type==='graded'||i.photo_front||i.photo_back){merged.push(i);return;}
  var k=[i.kind,i.type,i.match_key||(i.name+'|'+i.number+'|'+i.set_name),i.variant||'',i.condition||''].join('|');
  if(seen[k]){seen[k]._n++;return;}
  var c=Object.assign({},i,{_n:1});seen[k]=c;merged.push(c);
 });
 list=merged;
 list.forEach(function(i){var n=i.set_name||'Autres';if(!g[n]){g[n]=[];names.push(n);}g[n].push(i);});
 var era={};names.forEach(function(n){era[n]=g[n][0].set_id?TK.eraOf(g[n][0].set_id):{k:'autres',n:'Autres',o:99};});
 names.sort(function(a,b){return (era[a].o-era[b].o)||(a==='Autres'?1:b==='Autres'?-1:a.localeCompare(b,'fr'));});
 var lastEra=null;
 var one=names.length===1;
 if(!S.sets&&!S.setsLoading){S.setsLoading=true;TK.catalog.sets().then(function(x){S.sets=x;render();}).catch(function(){});}
 var meta={};(S.sets||[]).forEach(function(x){meta[x.id]=x;});
 var head=names.length>1?'<div style="display:flex;justify-content:flex-end;gap:8px;margin:4px 0"><button class="btn sm ghost" data-a="grpall" data-v="'+key+'|1">Tout déplier</button><button class="btn sm ghost" data-a="grpall" data-v="'+key+'|0">Tout replier</button></div>':'';
 return head+names.map(function(n){
  var eh='';if(era[n].k!==lastEra){lastEra=era[n].k;eh='<div class="era">'+esc(era[n].n)+'</div>';}
  var gk=key+'|'+n,open=S.open[gk]!==undefined?S.open[gk]:false,tot=g[n].reduce(function(t,i){return t+(i.value_eur>0?Number(i.value_eur)*(i._n||1):0);},0);
  return eh+'<details class="grp" data-gk="'+esc(gk)+'"'+(open?' open':'')+'><summary>'+setLogo(meta[g[n][0].set_id])+'<span class="grow">'+esc(n)+'</span><span class="chip">'+cnt(g[n])+'</span>'+(tot>0?'<span class="muted" style="font-size:12px">'+eur(tot)+'</span>':'')+'</summary>'+g[n].map(rowFn).join('')+'</details>';
 }).join('');
}
function itemRow(it,del){
 return '<div class="row"><button class="rowmain" data-a="item" data-v="'+esc(it.id)+'">'+cardImg(it)+
 '<span class="grow"><span class="name" style="display:block">'+label(it)+'</span><span class="muted" style="display:block">'+esc(it.set_name||'')+'</span>'+
 '<span style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">'+typeChip(it)+(it.variant?'<span class="chip">'+esc(it.variant)+'</span>':'')+(it._n>1?'<span class="chip acc">×'+it._n+'</span>':'')+'</span></span>'+
 '<span class="val">'+eur(it.value_eur)+'</span></button>'+
 (del?'<button class="icon-btn" data-a="del" data-v="'+esc(it.id)+'" aria-label="'+(it._n>1?'Retirer un exemplaire de ':'Retirer ')+esc(it.name)+'">'+ico(I.trash,20)+'</button>':'')+'</div>';
}
function vListes(){
 var tab=S.listTab,list=S.my[tab];
 return page('<div class="top"><div style="padding-left:8px"><h1 style="font-size:24px">Mes cartes</h1></div></div><div class="scroll">'+
 '<div class="seg" role="group"><button data-a="ltab" data-v="offers" aria-pressed="'+(tab==='offers')+'">Je propose ('+S.my.offers.length+')</button><button data-a="ltab" data-v="wants" aria-pressed="'+(tab==='wants')+'">Je recherche ('+S.my.wants.length+')</button></div>'+
 '<div style="margin-top:8px">'+(list.length?setGroups(list,'me-'+tab,function(i){return itemRow(i,true);}):'<p class="muted" style="padding:20px 0">Rien ici pour l\'instant.</p>')+'</div></div>'+
 '<div class="foot"><button class="btn primary" data-a="add" data-v="'+(tab==='offers'?'offer':'want')+'">Ajouter à '+(tab==='offers'?'Je propose':'Je recherche')+'</button></div>');
}
function kv(k,v){return v?'<div class="kv"><span>'+k+'</span><span style="text-align:right">'+v+'</span></div>':'';}
function vItem(t){
 if(t.err){return page(header('Carte',null,true)+'<div class="scroll"><p class="err" style="padding:24px 0">'+esc(t.err)+'</p></div>');}
 if(!t.data){return loading('Carte');}
 var it=t.data,o=it.owner||{},mine=S.user&&it.user_id===S.user.id;
 var imgs=[];
 if(it.photo_front){imgs.push(['Recto',it.photo_front]);}
 if(it.photo_back){imgs.push(['Verso',it.photo_back]);}
 var cat=TK.catImg(it,'high');if(!imgs.length&&cat){imgs.push(['Catalogue',cat]);}
 var cur=Math.min(t.img||0,imgs.length-1);
 var gal=imgs.length?'<button class="gbtn" data-a="light" data-v="'+cur+'" aria-label="Agrandir la photo"><img class="gmain" data-n="'+esc(it.name)+'" onerror="TK_imgFallback(this)" src="'+esc(imgs[cur][1])+'" alt="'+esc(it.name+' - '+imgs[cur][0])+'"></button>'+
  (imgs.length>1?'<div class="seg" style="margin-top:8px" role="group" aria-label="Face">'+imgs.map(function(x,i){return '<button data-a="gimg" data-v="'+i+'" aria-pressed="'+(i===cur)+'">'+x[0]+'</button>';}).join('')+'</div>':''):
  '<div class="gmain cph" style="background:'+phColor(it.name)+'">'+esc(it.name.charAt(0))+'</div>';
 var lv=t.live,foil=foilVariant(it.variant),val=it.value_eur,at=it.value_at,cmUrl=null;
 if(it.type==='loose'){cmUrl=(lv&&(lv.idProduct||lv.direct))?lv.url:TK.cmUrl(it);if(lv&&lv.doubt&&it.value_source!=='user'){val=null;}else if(lv&&(lv.price||lv.priceFoil)){val=foil?(lv.priceFoil||lv.price):(lv.price||lv.priceFoil);at=lv.updated;}}
 var src=it.value_source==='user'?'Estimation personnelle du propriétaire'+(at?' · le '+when(at):''):(val!=null&&it.type==='loose')||it.value_source==='cardmarket'?'Cardmarket, toutes langues (via TCGdex)'+(at?' · mis à jour le '+when(at):''):(it.type==='loose'?'':'Pas encore de source de prix automatique pour ce type d\'item');
 var buy='';
 if(it.type==='sealed'){
  var links=TK.buyLinks(it),aff=links.some(function(l){return l.aff;});
  buy='<div class="card"><div class="name">Acheter neuf</div><div class="muted" style="margin:2px 0 10px 0">Recherche déjà remplie pour ce produit.</div><div class="row2" style="grid-template-columns:repeat(3,1fr)">'+
   links.map(function(l){return '<a class="btn link" target="_blank" rel="noopener'+(l.aff?' sponsored':'')+'" href="'+esc(l.url)+'">'+l.label+(l.aff?' <span class="chip acc">affilié</span>':'')+'</a>';}).join('')+'</div>'+
   (aff?'<p class="note" style="margin-top:8px">Les liens marqués « affilié » nous rapportent une petite commission, sans surcoût pour toi.</p>':'')+'</div>';
 }
 var seller=mine?'':'<div class="card" style="display:flex;align-items:center;gap:12px">'+avatar(o,44)+'<div class="grow"><div class="muted">'+(it.kind==='offer'?'Proposé par':'Recherché par')+'</div><div class="name">'+esc(o.pseudo||'')+'</div><div style="font-size:13px">'+statsLine(t.stats)+'</div><div class="muted">Zone '+esc(o.zone_label||'')+(dist(o)?' · '+dist(o):'')+'</div></div><button class="btn sm" data-a="profile" data-v="'+esc(it.user_id)+'">Profil</button></div>';
 var actions=mine?'<div class="stack"><button class="btn" data-a="edititem" data-v="'+esc(it.id)+'">Modifier l\'état / les photos</button><button class="btn" data-a="del" data-v="'+esc(it.id)+'">Retirer de mes cartes</button></div>':(it.kind==='offer'?'<button class="btn primary" data-a="propose" data-v="'+esc(it.user_id)+'" data-item="'+esc(it.id)+'">Proposer un échange</button>':'');
 return page(header(label(it),esc(it.set_name||''),true)+'<div class="scroll"><div class="stack">'+gal+
  '<div class="card">'+
  kv('Type',it.type==='loose'?'Carte loose':it.type==='graded'?'Carte gradée':'Produit scellé')+
  kv('Numéro',it.number?esc(it.number):'')+
  kv('Série',esc((it.set_name||'')+(it.set_abbr?' ('+it.set_abbr+')':'')))+
  (it.variant?kv('Version',esc(it.variant)):'')+
  (it.type==='loose'?kv('État',esc(it.condition||'')):'')+
  (it.type==='graded'?kv('Grade',esc((it.grade_company||'')+' '+(it.grade||'')))+kv('N° de certificat',esc(it.cert||'')):'')+
  kv('Estimation',(cmUrl?'<a class="estlink" target="_blank" rel="noopener" href="'+esc(cmUrl)+'" title="Voir sur Cardmarket"><b>'+eur(val)+'</b> ↗</a>':'<b>'+eur(val)+'</b>')+(src?'<br><span class="muted">'+src+'</span>':'')+(mine&&(it.type!=='loose'||it.value_source==='user'||(lv&&lv.doubt))?'<br><button class="btn sm" style="margin-top:8px" data-a="editvalue" data-v="'+esc(it.id)+'">'+(val!=null?'Modifier l\'estimation':'Ajouter une estimation')+'</button>':''))+
  (it.notes?kv('Note',esc(it.notes)):'')+
  '<p class="note" style="margin:8px 0 0 0">Estimation indicative toutes langues confondues, pas un prix garanti. Le lien ouvre Cardmarket filtré sur le français pour comparer.'+(it.type==='graded'?' Vérifie le certificat auprès de la société de gradation.':'')+'</p></div>'+
  buy+seller+'</div></div>'+(actions?'<div class="foot">'+actions+'</div>':''));
}
function vProfileOther(t){
 if(t.err){return page(header('Profil',null,true)+'<div class="scroll"><p class="err" style="padding:24px 0">'+esc(t.err)+'</p></div>');}
 if(!t.data){return loading('Profil');}
 var p=t.data.profile,items=t.data.items,tab=t.tab||'offers';
 var list=items.filter(function(i){return i.kind===(tab==='offers'?'offer':'want');});
 var m=matchFor(items);
 return page(header('Profil',null,true)+'<div class="scroll"><div style="text-align:center"><div style="padding:8px 0 0 0;display:flex;justify-content:center">'+avatar(p,72,true)+'</div>'+
  '<div style="font-size:20px;font-weight:800;margin-top:10px">'+esc(p.pseudo)+'</div><div class="muted">Zone '+esc(p.zone_label||'')+(dist(p)?' · '+dist(p):'')+'</div>'+
  '<div style="margin-top:6px">'+statsLine(t.data.stats)+'</div>'+
  (m.gets.length&&m.gives.length?'<div style="margin-top:8px"><span class="chip acc">Échange mutuel possible</span></div>':'')+'</div>'+
  '<div class="seg" style="margin:16px 0 4px 0" role="group"><button data-a="ptab" data-v="offers" aria-pressed="'+(tab==='offers')+'">Propose</button><button data-a="ptab" data-v="wants" aria-pressed="'+(tab==='wants')+'">Recherche</button><button data-a="ptab" data-v="reviews" aria-pressed="'+(tab==='reviews')+'">Avis</button></div>'+
  (tab==='reviews'?reviewList(t.data.reviews):list.length?setGroups(list,'u-'+p.id+'-'+tab,function(i){return itemRow(i,false);}):'<p class="muted" style="padding:20px 0">Rien ici pour l\'instant.</p>')+'</div>'+
  '<div class="foot"><button class="btn primary" data-a="propose" data-v="'+esc(p.id)+'">Proposer un échange</button></div>');
}

/* ---------- ajout d'une carte ---------- */
function setOptions(sel,allLabel){
 var by={},order=[];
 (S.sets||[]).forEach(function(x){var e=TK.eraOf(x.id);if(!by[e.k]){by[e.k]={e:e,list:[]};order.push(e.k);}by[e.k].list.push(x);});
 order.sort(function(p,q){return by[p].e.o-by[q].e.o;});
 return '<option value="">'+allLabel+'</option>'+order.map(function(k){
  return '<optgroup label="'+esc(by[k].e.n)+'">'+by[k].list.map(function(x){var ab=TK.catalog.abbr(x.id);return '<option value="'+esc(x.id)+'"'+(x.id===sel?' selected':'')+'>'+esc(x.name)+(ab?' ('+esc(ab)+')':'')+'</option>';}).join('')+'</optgroup>';
 }).join('');
}
function selCount(){
 var a=S.add,n=0;Object.keys(a.sel).forEach(function(k){n+=Math.max(1,a.sel[k].picked.length)*(a.sel[k].qty||1);});return n;
}
function ownedCount(cardId){
 var a=S.add,list=a&&a.kind==='offer'?S.my.offers:S.my.wants,n=0,c=a&&a.byId&&a.byId[cardId],k=(c&&c.sealed)?TK.matchKey({type:'sealed',set_id:c.set_id,name:c.name}):'c:'+cardId;
 (list||[]).forEach(function(i){if(i.match_key===k){n++;}});return n;
}
function thumb(c){
 if(c.sealed){return '<div class="ph cph sealedph"><span>'+esc(TK.SEALED_SHORT[c.name]||c.name)+'</span></div>';}
 return c.image?'<img class="cthumb" loading="lazy" alt="" data-cid="'+esc(c.card_id||'')+'" data-n="'+esc(c.name)+'" onerror="TK_imgFallback(this)" src="'+esc(c.image)+'">':'<div class="ph cph" style="background:'+phColor(c.name)+'">'+esc(c.name.charAt(0))+'</div>';
}
function nrm(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function vsym(l){
 if(/^reverse$/i.test(l)){return 'R';}
 if(/^(normale|holo)$/i.test(l)){return null;}
 if(/master/i.test(l)){return 'M';}
 if(/cosmo/i.test(l)){return 'C';}
 if(/pok[eé]/i.test(l)){return 'P';}
 if(/tampon|stamp/i.test(l)){return 'T';}
 if(/1re|premi/i.test(l)){return '1';}
 return '✦';
}
function vtog(id){
 var t=S.add.sel[id];if(!t||!t.detail||!t.detail.variants){return '';}
 var h=t.detail.variants.map(function(l){var y=vsym(l);if(!y){return '';}
  return '<button class="vtog" data-a="tvart" data-v="'+esc(id)+'|'+esc(l)+'" aria-pressed="'+(t.picked.indexOf(l)>-1)+'" aria-label="'+esc(l)+'" title="'+esc(l)+'">'+y+'</button>';}).join('');
 return h?'<div class="vtogs" role="group" aria-label="Versions">'+h+'</div>':'';
}
function cardBtn(c){
 var a=S.add,sel=!!a.sel[c.card_id];a.byId[c.card_id]=c;
 var q=sel?(a.sel[c.card_id].qty||1):0,id=esc(c.card_id);
 return '<div class="catw"><button class="cat'+(sel?' sel':'')+(a.busy===c.card_id?' busy':'')+'" data-a="pickcard" data-v="'+id+'" aria-pressed="'+sel+'">'+thumb(c)+(sel?'<span class="selbadge" aria-hidden="true">✓</span>':'')+(ownedCount(c.card_id)?'<span class="ownbadge">Déjà ×'+ownedCount(c.card_id)+'</span>':'')+
  '<div class="bd"><div class="name" style="font-size:14px">'+labelBr(c)+'</div><div class="muted" style="font-size:12px">'+esc(c.set_name||'')+'</div></div></button>'+
  (sel?vtog(c.card_id):'')+
  (sel?'<div class="qstep" role="group" aria-label="Quantité"><button data-a="tqty" data-v="'+id+'|-1" aria-label="Moins"'+(q<=1?' disabled':'')+'>−</button><span aria-live="polite">'+q+'</span><button data-a="tqty" data-v="'+id+'|1" aria-label="Plus"'+(q>=9?' disabled':'')+'>+</button></div>':'')+'</div>';
}
function loadSetCards(id){
 var a=S.add;if(!a||a.setCards[id]||a.setLoad[id]){return;}
 a.setLoad[id]=true;
 TK.catalog.search('',id).then(function(r){a.setCards[id]=r.list;}).catch(function(){a.setCards[id]=[];a.err='Catalogue indisponible pour le moment. Réessaie dans un instant.';}).then(function(){if(S.add===a){render();}});
}
/* Arbre : génération > série (logo + sigle) > cartes. Pendant une recherche, les séries correspondantes s'ouvrent. */
function sealedCards(x){
 return TK.SEALED_KINDS.filter(function(k){return k!=='Autre';}).map(function(k){return {card_id:'s:'+x.id+':'+k,name:k,number:null,set_id:x.id,set_name:x.name,set_abbr:TK.catalog.abbr(x.id),image:null,sealed:true};});
}
function resultsHtml(){
 if(S.add.type==='sealed'){return sealedTree();}
 var a=S.add,qq=a.q.trim(),qmode=qq.length>=2;
 if(a.err){return '<p class="err">'+esc(a.err)+'</p>';}
 if(!S.sets){return '<p class="muted">Chargement des séries…</p>';}
 var res=qmode&&a.results?a.results:[],bySet={};res.forEach(function(c){(bySet[c.set_id]=bySet[c.set_id]||[]).push(c);});
 var toks=nrm(qq).split(/\s+/).filter(function(t){return t.length>=2;});
 var vis=S.sets.filter(function(x){
  if(!qmode){return true;}
  if(bySet[x.id]){return true;}
  var hay=nrm(x.name+' '+(TK.catalog.abbr(x.id)||'')+' '+x.id);
  return toks.length&&toks.every(function(t){return hay.indexOf(t)>-1;});
 });
 if(qmode&&!vis.length){return '<p class="muted">'+(a.loading?'Recherche…':esc(a.hint||'Aucun résultat.'))+'</p>';}
 var by={},order=[];
 vis.forEach(function(x){var e=TK.eraOf(x.id);if(!by[e.k]){by[e.k]={e:e,list:[]};order.push(e.k);}by[e.k].list.push(x);});
 order.sort(function(p,q){return by[p].e.o-by[q].e.o;});
 var autoSets=qmode&&vis.length<=6,p=qmode?'aq|':'ab|';
 var head=qmode?'<div class="muted" style="margin-bottom:6px" aria-live="polite">'+res.length+' carte'+(res.length>1?'s':'')+(a.loading?' · recherche…':'')+'</div>':'';
 return head+order.map(function(k){
  var g=by[k],ek=p+'e|'+k,eopen=S.open[ek]!==undefined?S.open[ek]:qmode;
  var inner=g.list.map(function(x){
   var sk=p+'s|'+x.id,open=S.open[sk]!==undefined?S.open[sk]:autoSets,ab=TK.catalog.abbr(x.id),cards=null,body='';
   cards=qmode&&bySet[x.id]?bySet[x.id]:a.setCards[x.id];
   if(cards){body='<div class="cgrid">'+cards.map(cardBtn).join('')+'</div>';}
   else if(open&&eopen){loadSetCards(x.id);body='<p class="muted" style="padding:6px 0">Chargement…</p>';}
   var cnt=(qmode&&bySet[x.id])?bySet[x.id].length:(a.setCards[x.id]?a.setCards[x.id].length:(x.official||x.total||''));
   return '<details class="grp sub" data-gk="'+esc(sk)+'" data-set="'+esc(x.id)+'"'+(open?' open':'')+'><summary>'+setLogo(x)+'<span class="grow">'+esc(x.name)+(ab?' <span class="abbr">'+esc(ab)+'</span>':'')+'</span>'+(cnt!==''?'<span class="chip">'+cnt+'</span>':'')+'</summary>'+body+'</details>';
  }).join('');
  return '<details class="grp era-grp" data-gk="'+esc(ek)+'"'+(eopen?' open':'')+'><summary><span class="grow">'+esc(g.e.n)+'</span><span class="chip">'+g.list.length+'</span></summary>'+inner+'</details>';
 }).join('');
}
function sealedCard(x,k){return {card_id:'s:'+x.id+':'+k,name:k,number:null,set_id:x.id,set_name:x.name,set_abbr:TK.catalog.abbr(x.id),image:null,sealed:true};}
/* Produits scellés : produit > génération > série (on coche la série). */
function sealedTree(){
 var a=S.add,qq=a.q.trim(),qmode=qq.length>=2;
 if(!S.sets){return '<p class="muted">Chargement des séries…</p>';}
 var toks=nrm(qq).split(/\s+/).filter(function(t){return t.length>=2;});
 var kinds=TK.SEALED_KINDS.filter(function(k){return k!=='Autre';});
 var kt=[],st=[];
 toks.forEach(function(t){var hit=kinds.some(function(k){return nrm(k+' '+(TK.SEALED_SHORT[k]||'')).indexOf(t)>-1;});(hit?kt:st).push(t);});
 var vis=S.sets.filter(function(x){
  if(!qmode||!st.length){return true;}
  var hay=nrm(x.name+' '+(TK.catalog.abbr(x.id)||'')+' '+x.id);
  return st.every(function(t){return hay.indexOf(t)>-1;});
 });
 var ks=kinds.filter(function(k){return !kt.length||kt.some(function(t){return nrm(k+' '+(TK.SEALED_SHORT[k]||'')).indexOf(t)>-1;});});
 if(!vis.length){return '<p class="muted">Aucune série ne correspond.</p>';}
 var by={},order=[];
 vis.forEach(function(x){var e=TK.eraOf(x.id);if(!by[e.k]){by[e.k]={e:e,list:[]};order.push(e.k);}by[e.k].list.push(x);});
 order.sort(function(p,q){return by[p].e.o-by[q].e.o;});
 var autoEra=qmode&&vis.length<=40;
 return '<p class="note" style="margin-bottom:8px">Pas de photos de catalogue pour les produits scellés : choisis le produit, puis la série.</p>'+ks.map(function(k){
  var kk='sk|'+k,kopen=S.open[kk]!==undefined?S.open[kk]:qmode,nsel=vis.filter(function(x){return a.sel['s:'+x.id+':'+k];}).length;
  var body='';
  if(kopen){
   body=order.map(function(o){
    var g=by[o],ek='se|'+k+'|'+o,eopen=S.open[ek]!==undefined?S.open[ek]:autoEra,rows='';
    if(eopen){
     rows=g.list.map(function(x){
      var c=sealedCard(x,k),sel=!!a.sel[c.card_id],ab=TK.catalog.abbr(x.id),own=(a.byId[c.card_id]=c)&&ownedCount(c.card_id);
      return '<button class="setpick'+(sel?' sel':'')+'" data-a="pickcard" data-v="'+esc(c.card_id)+'" aria-pressed="'+sel+'">'+setLogo(x)+'<span class="grow">'+esc(x.name)+(ab?' <span class="abbr">'+esc(ab)+'</span>':'')+'</span>'+(own?'<span class="ownbadge inl">Déjà ×'+own+'</span>':'')+(sel?'<span class="selbadge inl" aria-hidden="true">✓</span>':'')+'</button>';
     }).join('');
    }
    return '<details class="grp era-grp" data-gk="'+esc(ek)+'"'+(eopen?' open':'')+'><summary><span class="grow">'+esc(g.e.n)+'</span><span class="chip">'+g.list.length+'</span></summary>'+rows+'</details>';
   }).join('');
  }
  return '<details class="grp" data-gk="'+esc(kk)+'"'+(kopen?' open':'')+'><summary><span class="grow">'+esc(k)+'</span>'+(nsel?'<span class="chip acc">'+nsel+' choisi'+(nsel>1?'s':'')+'</span>':'')+'</summary>'+body+'</details>';
 }).join('');
}
function trayHtml(){
 var a=S.add,ids=Object.keys(a.sel),offer=a.kind==='offer';
 if(!ids.length){return '';}
 return '<div class="card tray" style="margin-top:14px"><div class="name">Sélection · '+selCount()+' item'+(selCount()>1?'s':'')+'</div>'+
  '<div class="note" style="margin:2px 0 6px 0">'+(offer?'Coche chaque version que tu possèdes : un item est créé par version. Les cartes courantes n\'ont pas besoin de photos.':'Coche la version voulue, ou rien si toutes conviennent.')+'</div>'+
  ids.map(function(id){var t=a.sel[id];
   return '<div class="trow"><div style="display:flex;gap:8px;align-items:center"><span class="grow"><span class="name" style="font-size:14px;display:block">'+labelBr(t.card)+'</span><span class="muted" style="font-size:12px">'+esc(t.card.set_name||'')+'</span></span><button class="icon-btn" data-a="tdel" data-v="'+esc(id)+'" aria-label="Retirer '+esc(t.card.name)+'">✕</button></div>'+
   '<div class="vchips" role="group" aria-label="Versions">'+t.detail.variants.map(function(v){return '<button class="vchip" data-a="tvar" data-v="'+esc(id)+'|'+esc(v)+'" aria-pressed="'+(t.picked.indexOf(v)>-1)+'">'+esc(v)+'</button>';}).join('')+'</div>'+'<div class="qty"><span class="muted">Quantité'+(t.picked.length>1?' (par version)':'')+(ownedCount(id)?' · déjà ×'+ownedCount(id)+' dans ta liste':'')+'</span><span class="qctl"><button class="icon-btn" data-a="tqty" data-v="'+esc(id)+'|-1" aria-label="Moins">−</button><b>'+(t.qty||1)+'</b><button class="icon-btn" data-a="tqty" data-v="'+esc(id)+'|1" aria-label="Plus">+</button></span></div></div>';
  }).join('')+
  (offer?'<div style="margin-top:10px"><label class="muted" for="f-condition">État (pour toutes)</label><select id="f-condition" class="field" data-f="condition">'+CONDITIONS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===a.f.condition?' selected':'')+'>'+c[1]+'</option>';}).join('')+'</select></div>':'')+'</div>';
}
function vAdd(){
 var a=S.add,isOffer=a.kind==='offer',title='Ajouter à '+(isOffer?'Je propose':'Je recherche');
 if(a.picked){return vAddForm(title);}
 var pills='<div class="pills" role="group" aria-label="Type">'+[['loose','Loose'],['graded','Gradée'],['sealed','Scellé']].map(function(t){return '<button class="pill" data-a="atype" data-v="'+t[0]+'" aria-pressed="'+(a.type===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
 var body='';
 if(a.type==='sealed'){
  body='<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px"><input id="aq" class="field" type="search" placeholder="Série, sigle ou produit (ex. PBL etb)" aria-label="Rechercher une série ou un produit scellé" value="'+esc(a.q)+'" autocomplete="off"></div>'+
   trayHtml()+'<div style="margin-top:14px">'+sealedTree()+'</div>'+
   '<details class="grp" style="margin-top:14px"><summary>Autre produit (nom libre)</summary><div style="display:flex;flex-direction:column;gap:12px;padding-bottom:8px">'+
   '<div><label class="muted" for="aset">Série</label><select id="aset" class="field">'+setOptions(a.setId,'Choisis une série')+'</select></div>'+
   '<div><label class="muted" for="scustom">Nom du produit</label><input id="scustom" class="field" data-f="custom" value="'+esc(a.f.custom)+'" placeholder="Ex. Coffret Dracaufeu ex"></div>'+
   '<button class="btn primary" data-a="picksealed">Continuer</button></div></details>';
 }else{
  body='<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">'+
   '<input id="aq" class="field" type="search" placeholder="Nom, sigle, n° (ex. Darkrai PBL 110)" aria-label="Rechercher une carte par nom, sigle de série ou numéro" value="'+esc(a.q)+'" autocomplete="off">'+
   '</div>'+
   trayHtml()+'<div style="margin-top:14px">'+resultsHtml()+
   '<p style="margin-top:14px"><button class="btn sm ghost" style="color:var(--accent)" data-a="manual">Je ne trouve pas ma carte</button></p></div>';
 }
 var nsel=Object.keys(a.sel).length,cnt=selCount(),bad=isOffer&&Object.keys(a.sel).some(function(k){return !a.sel[k].picked.length;});
 return page(header(title,null,true)+'<div class="scroll">'+pills+body+'</div>'+((a.type==='loose'||a.type==='sealed')&&nsel?'<div class="foot">'+(bad?'<div class="note" style="margin-bottom:8px">Choisis au moins une version pour chaque carte.</div>':'')+'<button class="btn primary" data-a="addmulti"'+(bad||a.saving||!cnt?' disabled':'')+'>'+(a.saving?'Envoi…':'Ajouter '+cnt+' item'+(cnt>1?'s':''))+'</button></div>':''));
}
function photoBox(side,lbl){
 var ph=S.add.photos[side];
 return '<div><button class="photobox'+(ph?' ok':'')+'" data-a="pickside" data-v="'+side+'" aria-label="'+(ph?'Changer la photo ':'Ajouter la photo ')+lbl.toLowerCase()+'">'+
  (ph?'<img src="'+esc(ph.url)+'" alt="Aperçu '+lbl.toLowerCase()+'">':ico(I.camera,28)+'<span>'+lbl+(S.add.type==='loose'&&S.add.price&&S.add.price.low&&!S.add.picked.manual?'':' *')+'</span>')+'</button><input type="file" accept="image/*" id="pf-'+side+'" hidden></div>';
}
function addMissing(){
 var a=S.add,f=a.f,m=[],offer=a.kind==='offer';
 if(a.picked.manual&&!f.name.trim()){m.push('le nom de la carte');}
 if(offer){
  var optional=a.type==='loose'&&a.price&&a.price.low&&!a.picked.manual;
  if(optional){if(!!a.photos.front!==!!a.photos.back){m.push('l\'autre photo (ou aucune)');}}
  else{
   if(!a.photos.front){m.push('la photo recto');}
   if(!a.photos.back){m.push('la photo verso');}
  }
  if(a.type==='graded'){if(!f.grade.trim()){m.push('la note');}if(!f.cert.trim()){m.push('le numéro de certificat');}}
 }
 return m;
}
function vAddForm(title){
 var a=S.add,f=a.f,p=a.picked,offer=a.kind==='offer',missing=addMissing();
 var img=(a.price&&a.price.image)||p.image;
 var head='<div class="card" style="display:flex;gap:12px;align-items:center">'+(img?'<img class="cimg" style="width:56px;height:78px" alt="" src="'+esc(img)+'">':'<span class="cph" style="width:56px;height:78px;background:'+phColor(p.name||'?')+'">'+esc((p.name||'?').charAt(0))+'</span>')+
  '<div class="grow"><div class="name">'+(p.manual?'Saisie manuelle':labelBr(p))+'</div><div class="muted">'+esc(p.set_name||'')+'</div><div style="margin-top:6px"><span class="chip">'+(a.type==='loose'?'Loose':a.type==='graded'?'Gradée':'Scellé')+'</span></div></div>'+
  '<button class="btn sm" data-a="unpick">Changer</button></div>';
 var fields='';
 if(p.manual){fields+='<div><label class="muted" for="f-name">Nom *</label><input id="f-name" class="field" data-f="name" value="'+esc(f.name)+'"></div><div class="row2"><div><label class="muted" for="f-number">Numéro (ex. 102/96)</label><input id="f-number" class="field" data-f="number" value="'+esc(f.number)+'"></div><div><label class="muted" for="f-setName">Série</label><input id="f-setName" class="field" data-f="setName" value="'+esc(f.setName)+'"></div></div>';}
 if(a.type==='loose'){fields+='<div><label class="muted" for="f-condition">État</label><select id="f-condition" class="field" data-f="condition">'+CONDITIONS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===f.condition?' selected':'')+'>'+c[1]+'</option>';}).join('')+'</select></div>';}
 if(a.type==='graded'){fields+='<div class="row2"><div><label class="muted" for="f-company">Société</label><select id="f-company" class="field" data-f="company">'+COMPANIES.map(function(c){return '<option'+(c===f.company?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div><div><label class="muted" for="f-grade">Note'+(offer?' *':'')+'</label><input id="f-grade" class="field" data-f="grade" inputmode="decimal" placeholder="Ex. 9,5" value="'+esc(f.grade)+'"></div></div>'+
  '<div><label class="muted" for="f-cert">N° de certificat'+(offer?' *':'')+'</label><input id="f-cert" class="field" data-f="cert" value="'+esc(f.cert)+'" placeholder="Visible sur l\'étiquette de la slab"></div>';}
 if(a.type==='loose'&&a.price&&a.price.variants&&a.price.variants.length){fields+='<div><div class="name" style="margin-bottom:6px">Version</div><div class="vchips" role="group" aria-label="Version">'+a.price.variants.map(function(v){return '<button class="vchip" data-a="svar" data-v="'+esc(v)+'" aria-pressed="'+(f.variant===v)+'">'+esc(v)+'</button>';}).join('')+'</div></div>';}
 var priceNote;
 if(a.type==='loose'){priceNote=a.price&&a.price.price?'Cote automatique Cardmarket (toutes langues) : <a class="estlink" target="_blank" rel="noopener" href="'+esc((a.price.idProduct||a.price.direct)?a.price.url:TK.cmUrl(a.picked))+'"><b>'+eur(a.price.price)+'</b> ↗</a> (mise à jour le '+when(a.price.updated)+'). Elle est calculée pour toi et ne peut pas être modifiée.':(a.price&&a.price.doubt?'Cote automatique non fiable pour cette version (même produit Cardmarket que la carte de base du set). Saisis ta propre estimation ci-dessous.':'Cote automatique en cours de chargement ou indisponible pour cette carte.');}
 else if(a.type==='graded'){priceNote=(a.price&&a.price.price?'Repère : la carte non gradée vaut '+eur(a.price.price)+' sur Cardmarket. ':'')+'Pas d\'estimation automatique pour les cartes gradées en bêta : saisis la tienne ci-dessous, sinon « indisponible ».';}
 else{priceNote='Pas d\'estimation automatique pour les produits scellés en bêta : saisis la tienne ci-dessous, sinon « indisponible ».';}
 var hasAuto=a.type==='loose'&&a.price&&a.price.price;
 fields+='<div class="card" style="background:var(--surface2)"><div class="name" style="font-size:14px">Estimation</div><div class="note" style="margin-top:4px">'+priceNote+'</div>'+
  (hasAuto?'':'<label class="muted" for="f-value" style="display:block;margin-top:10px">Ta propre estimation en € (facultatif, modifiable plus tard)</label><input id="f-value" class="field" data-f="value" inputmode="decimal" placeholder="Ex. 45" value="'+esc(f.value)+'">')+'</div>';
 var optPh=a.type==='loose'&&a.price&&a.price.low&&!p.manual;
 if(offer){fields+='<div><div class="name" style="margin-bottom:2px">Photos'+(optPh?' (facultatives)':' *')+'</div><div class="note" style="margin-bottom:8px">'+(optPh?'Carte courante : les photos ne sont pas obligatoires, mais elles rassurent. Si tu en ajoutes, mets le recto et le verso.':'Recto et verso obligatoires.')+' Photos non retouchées, bien éclairées, '+(a.type==='sealed'?'face avant et arrière de la boîte.':a.type==='graded'?'face avant et arrière de la slab, étiquette lisible.':'carte à plat, coins visibles.')+'</div><div class="row2">'+photoBox('front','Recto')+photoBox('back','Verso')+'</div></div>';}
 fields+='<div><label class="muted" for="f-notes">Note (facultatif)</label><textarea id="f-notes" class="field" data-f="notes" rows="2" maxlength="500" style="padding:10px 12px;resize:vertical">'+esc(f.notes)+'</textarea></div>';
 return page(header(title,null,true)+'<div class="scroll"><div class="stack">'+head+fields+'</div></div>'+
  '<div class="foot"><div id="addhint" class="note" style="margin-bottom:8px">'+(missing.length?'Il manque : '+missing.join(', ')+'.':'')+'</div><button id="addbtn" class="btn primary" data-a="addsubmit"'+(missing.length||a.saving?' disabled':'')+'>'+(a.saving?'Envoi…':'Ajouter')+'</button></div>');
}
function refreshAddBtn(){
 var b=$('#addbtn');if(!b||!S.add||!S.add.picked){return;}
 var m=addMissing();b.disabled=m.length>0||S.add.saving;
 $('#addhint').textContent=m.length?'Il manque : '+m.join(', ')+'.':'';
}

/* ---------- proposition d'échange ---------- */
function snap(it){return {id:it.id,name:it.name,number:it.number||null,set_name:it.set_name||null,type:it.type,value_eur:it.value_eur==null?null:Number(it.value_eur),img:it.photo_front||it.catalog_image||null};}
function vPropose(t){
 if(!t.loaded){return loading('Proposition');}
 var to=t.to;
 function block(title,list,key){
  return '<div class="card"><div class="name">'+title+'</div>'+(list.length?list.map(function(it){
   var on=t[key].indexOf(it.id)>-1;
   return '<button class="row chk" data-a="toggle" data-k="'+key+'" data-v="'+esc(it.id)+'" aria-pressed="'+on+'"><span class="box'+(on?' on':'')+'">'+(on?ico(I.check,16,'currentColor'):'')+'</span>'+cardImg(it)+'<span class="grow"><span class="name" style="display:block">'+label(it)+'</span><span class="muted" style="display:block">'+esc(it.set_name||'')+'</span></span><span class="val">'+eur(it.value_eur)+'</span></button>';
  }).join(''):'<p class="muted">Aucun item disponible.</p>')+'</div>';
 }
 var gv=S.my.offers.filter(function(i){return t.give.indexOf(i.id)>-1;}),rv=t.theirs.filter(function(i){return t.get.indexOf(i.id)>-1;});
 var g=sumVal(gv),r=sumVal(rv),diff=r-g,none=gv.concat(rv).filter(function(i){return i.value_eur==null;}).length;
 var verdict=(!gv.length&&!rv.length)?'Choisis des items de chaque côté':Math.abs(diff)<=Math.max(5,0.1*Math.max(g,r))?'Presque équilibré':(diff>0?'≈ '+Math.round(diff)+' € en ta faveur':'≈ '+Math.round(-diff)+' € en faveur de '+esc(to.pseudo));
 return page(header('Proposition d\'échange','avec '+esc(to.pseudo),true)+'<div class="scroll"><div class="stack">'+
  block('Tu donnes · '+eur(g),S.my.offers,'give')+block('Tu reçois · '+eur(r),t.theirs.filter(function(i){return i.kind==='offer';}),'get')+
  '<div class="card"><div style="display:flex;justify-content:space-between;gap:12px;font-weight:800"><span>Écart de valeur</span><span style="text-align:right">'+verdict+'</span></div><div class="bar" style="margin-top:10px" aria-hidden="true"><div style="flex:'+(g||0.001)+';background:var(--accent)"></div><div style="flex:'+(r||0.001)+';background:var(--accent-soft)"></div></div><div class="note" style="margin-top:8px">Valeurs figées à l\'envoi.'+(none?' '+none+' item(s) sans estimation comptent pour 0 €.':'')+'</div></div>'+
  '<div><div class="name" style="margin-bottom:8px">Remise</div><div class="seg" role="group"><button data-a="handover" data-v="main" aria-pressed="'+(t.handover==='main')+'">En main propre</button><button data-a="handover" data-v="envoi" aria-pressed="'+(t.handover==='envoi')+'">Par envoi</button></div><div class="note" style="margin-top:8px">'+(t.handover==='main'?'Dans une boutique partenaire ou un lieu public. Recommandé.':'Suivi conseillé. La plateforme ne garantit pas les envois entre utilisateurs.')+'</div></div>'+
  '</div></div><div class="foot"><button class="btn primary" data-a="send"'+((t.give.length&&t.get.length&&!t.sending)?'':' disabled')+'>'+(t.sending?'Envoi…':'Envoyer la proposition')+'</button></div>');
}

/* ---------- échanges ---------- */
function other(pr){return pr.from_user===S.user.id?pr.to_p:pr.from_p;}
function snapList(list){return (list||[]).map(function(i){return esc(i.name)+(i.number?' ('+esc(i.number)+')':'');}).join(', ')||'—';}
function vEchanges(){
 var rows=S.props.length?S.props.map(function(pr){
  var o=other(pr)||{},mineP=pr.from_user===S.user.id;
  return '<button class="row mrow" data-a="proposal" data-v="'+esc(pr.id)+'">'+avatar(o,44)+'<span class="grow"><span class="name" style="display:block">'+esc(o.pseudo||'')+'</span><span class="muted" style="display:block">'+(mineP?'Tu donnes':'Tu reçois')+' '+snapList(pr.give)+'</span><span class="muted" style="display:block">'+(mineP?'Tu reçois':'Tu donnes')+' '+snapList(pr.get)+'</span></span><span class="chip'+(pr.status==='accepted'||pr.status==='done'?' acc':'')+'">'+STATUS[pr.status]+'</span></button>';
 }).join(''):'<p class="muted" style="padding:20px 0">Aucun échange pour l\'instant. Ouvre un profil sur la carte et propose un échange.</p>';
 return page('<div class="top"><div style="padding-left:8px"><h1 style="font-size:24px">Échanges</h1></div></div><div class="scroll">'+rows+'</div>');
}
function msgHtml(){
 return S.msgs.length?S.msgs.map(function(m){return '<div class="msg'+(m.sender===S.user.id?' me':'')+'">'+esc(m.body)+'</div>';}).join(''):'<p class="muted">Aucun message pour l\'instant. Propose un lieu et une heure de rendez-vous.</p>';
}
function vProposal(t){
 var pr=S.props.filter(function(x){return x.id===t.id;})[0];
 if(!pr){return loading('Échange');}
 var o=other(pr)||{},iAmFrom=pr.from_user===S.user.id,iGive=iAmFrom?pr.give:pr.get,iGet=iAmFrom?pr.get:pr.give;
 var steps=['Proposition envoyée','Proposition acceptée','Rendez-vous fixé','Échange effectué'];
 var cur=pr.status==='sent'?0:pr.status==='accepted'?2:pr.status==='done'?4:-1;
 var stepsHtml=cur<0?'<div class="card"><div class="name">'+STATUS[pr.status]+'</div></div>':steps.map(function(s,i){
  var c=i<cur?'done':i===cur?'now':'';
  return '<div class="step '+c+'"><i>'+(i<cur?ico(I.check,14,'currentColor'):'')+'</i><span>'+s+'</span></div>';
 }).join('<div class="stepline" aria-hidden="true"></div>');
 var act='';
 if(pr.status==='sent'&&!iAmFrom){act='<div class="row2"><button class="btn" data-a="pstatus" data-v="declined">Refuser</button><button class="btn primary" data-a="pstatus" data-v="accepted">Accepter</button></div>';}
 else if(pr.status==='sent'&&iAmFrom){act='<button class="btn" data-a="pstatus" data-v="cancelled">Annuler ma proposition</button>'+(TK.demo?'<button class="btn ghost" style="margin-top:6px" data-a="demoreply">Démo : simuler l\'acceptation</button>':'');}
 else if(pr.status==='accepted'){act='<button class="btn primary" data-a="pstatus" data-v="done">Échange effectué</button>';}
 var review='';
 if(pr.status==='done'){
  var rv=S.rev&&S.rev.pid===pr.id?S.rev:null;
  if(rv&&rv.mine){review='<div class="card"><div class="name">Ton avis</div><div style="margin-top:6px">'+stars(rv.mine.rating,20)+'</div>'+(rv.mine.comment?'<p style="margin:6px 0 0 0;font-size:14px">'+esc(rv.mine.comment)+'</p>':'')+'</div>';}
  else if(rv){
   review='<div class="card"><div class="name">Note '+esc(o.pseudo||'')+'</div><div class="muted" style="margin:2px 0 8px 0">Comment s\'est passé l\'échange ? Un avis est définitif.</div>'+
    '<div class="seg" role="group" aria-label="Note sur 5">'+[1,2,3,4,5].map(function(n){return '<button data-a="rate" data-v="'+n+'" aria-pressed="'+(rv.rating===n)+'">'+n+' ★</button>';}).join('')+'</div>'+
    '<textarea id="revtxt" class="field" rows="3" maxlength="500" placeholder="Un mot sur l\'échange (facultatif)" style="margin-top:8px">'+esc(rv.comment||'')+'</textarea>'+
    '<button class="btn primary" style="margin-top:8px" data-a="sendreview"'+(rv.rating?'':' disabled')+'>Publier mon avis</button></div>';
  }
 }
 var chat=(pr.status==='sent'||pr.status==='accepted'||pr.status==='done')?
  '<div class="card"><div class="name">Messages</div><div id="chat" class="chat">'+msgHtml()+'</div><form id="msgform" class="msgform"><input id="msgin" class="field" placeholder="Écris un message" maxlength="1000" autocomplete="off" aria-label="Message"><button class="btn primary sm" type="submit">Envoyer</button></form></div>':'';
 return page(header('Échange avec '+esc(o.pseudo||''),pr.handover==='main'?'En main propre':'Par envoi',true)+'<div class="scroll"><div class="stack">'+
  '<div>'+stepsHtml+'</div>'+
  '<div class="card"><div class="kv"><span>Tu donnes</span><span style="text-align:right">'+snapList(iGive)+'</span></div><div class="kv"><span>Tu reçois</span><span style="text-align:right">'+snapList(iGet)+'</span></div><div class="kv"><span>Valeur à l\'envoi</span><span style="text-align:right">'+eur(iAmFrom?pr.give_value:pr.get_value)+' contre '+eur(iAmFrom?pr.get_value:pr.give_value)+'</span></div></div>'+
  '<div class="card" style="background:var(--surface2)"><div class="name" style="margin-bottom:6px">Avant le rendez-vous</div><div style="font-size:14px">Vérifie le certificat des cartes gradées.<br>Contrôle l\'état devant l\'autre personne.<br>Choisis un lieu public ou une boutique partenaire.</div></div>'+
  act+review+chat+'</div></div>');
}

/* ---------- profil ---------- */
function vProfil(){
 var u=S.user;
 return page('<div class="top"><div style="padding-left:8px"><h1 style="font-size:24px">Profil</h1></div></div><div class="scroll">'+
 '<div class="card" style="display:flex;align-items:center;gap:14px"><button class="avedit" data-a="editavatar" aria-label="Changer la photo de profil">'+avatar(u,72,true)+'<span class="avbadge">'+ico(I.camera,13,'#0A0B0D')+'</span></button>'+'<div class="grow"><div class="name" style="font-size:17px">'+esc(u.pseudo)+'</div><div class="muted">'+S.my.offers.length+' à proposer · '+S.my.wants.length+' recherchées</div><div style="font-size:13px;margin-top:4px">'+statsLine(S.myStats)+'</div></div></div>'+
 '<details class="grp" style="margin-top:20px" data-gk="prof|avis"'+(S.open['prof|avis']?' open':'')+'><summary><span class="grow">Tes avis reçus</span><span class="chip">'+S.myReviews.length+'</span></summary>'+reviewList(S.myReviews)+'</details>'+
 '<div class="name" style="margin:20px 0 4px 0">Ta zone</div><div class="muted" style="margin-bottom:8px">'+(u.zone_label?esc(u.zone_label)+' (zone approximative, environ 2 km)':'Non définie : tu n\'apparais pas sur la carte.')+'</div>'+
 '<button class="btn" data-a="editzone">Modifier ma zone</button>'+
 '<details class="grp" style="margin-top:20px" data-gk="prof|nrj"'+(S.open['prof|nrj']?' open':'')+'><summary><span class="grow">Ton énergie</span></summary><div style="padding-top:6px">'+energyTiles()+'</div></details>'+
 (TK.demo?'<p class="note" style="margin-top:16px">Mode démo : profils, cartes et valeurs fictifs, rien n\'est enregistré.</p>':'')+
 '<button class="btn" style="margin-top:16px" data-a="logout">Se déconnecter</button>'+
 '<p class="note" style="margin-top:16px;text-align:center"><a href="legal.html#mentions" target="_blank" rel="noopener">Mentions légales</a> · <a href="legal.html#confidentialite" target="_blank" rel="noopener">Confidentialité</a> · <a href="legal.html#cgu" target="_blank" rel="noopener">Conditions</a></p></div>');
}

/* ---------- fenêtres ---------- */
function sideLabel(side){return side==='front'?'Recto':'Verso';}
function vSheet(){
 var s=S.sheet;if(!s){return '';}
 if(s.kind==='edit'){
  var t0=top(),it=t0&&t0.data;if(!it){return '';}
  var ff='';
  if(it.type==='loose'){ff+='<div><label class="muted" for="e-condition">État</label><select id="e-condition" class="field" data-ef="condition">'+CONDITIONS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===s.f.condition?' selected':'')+'>'+c[1]+'</option>';}).join('')+'</select></div>';}
  if(it.type==='graded'){ff+='<div class="row2"><div><label class="muted" for="e-company">Société</label><select id="e-company" class="field" data-ef="company">'+COMPANIES.map(function(c){return '<option'+(c===s.f.company?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div><div><label class="muted" for="e-grade">Note</label><input id="e-grade" class="field" data-ef="grade" inputmode="decimal" value="'+esc(s.f.grade)+'"></div></div><div><label class="muted" for="e-cert">N° de certificat</label><input id="e-cert" class="field" data-ef="cert" value="'+esc(s.f.cert)+'"></div>';}
  function pbox(side,lbl,cur){var u=s.photos[side]?s.photos[side].url:cur;return '<div><button class="photobox'+(u?' ok':'')+'" data-a="editphoto" data-v="'+side+'" aria-label="Changer la photo '+lbl.toLowerCase()+'">'+(u?'<img src="'+esc(u)+'" alt="'+lbl+'">':ico(I.camera,28)+'<span>'+lbl+'</span>')+'</button><input type="file" accept="image/*" id="ef-'+side+'" hidden></div>';}
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Modifier"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="name" style="font-size:17px">Modifier cet item</div><button class="icon-btn" data-a="closesheet" aria-label="Fermer">✕</button></div><div class="stack">'+ff+
   (it.kind==='want'&&!it.photo_front?'':'<div><div class="name" style="font-size:14px">Photos</div><div class="note">Touche une photo pour la remplacer.</div><div class="editph">'+pbox('front','Recto',it.photo_front)+pbox('back','Verso',it.photo_back)+'</div></div>')+
   '<button class="btn primary" data-a="saveedit"'+(s.saving?' disabled':'')+'>'+(s.saving?'Enregistrement…':'Enregistrer')+'</button></div></div></div>';
 }
 if(s.kind==='value'){
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Estimation"><div class="name" style="font-size:17px">Ton estimation</div><p class="muted" style="margin:6px 0 10px 0">Montant en euros. Elle est affichée comme estimation personnelle.</p>'+
   '<input id="valin" class="field" inputmode="decimal" placeholder="Ex. 45" value="'+esc(s.cur==null?'':String(s.cur).replace('.',','))+'" autocomplete="off">'+
   '<div class="row2" style="margin-top:12px"><button class="btn" data-a="closesheet">Annuler</button><button class="btn primary" data-a="savevalue">Enregistrer</button></div>'+
   (s.cur!=null?'<button class="btn ghost" style="margin-top:6px" data-a="clearvalue">Retirer l\'estimation</button>':'')+'</div></div>';
 }
 if(s.kind==='avatar'){
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Photo de profil"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="name" style="font-size:17px">Photo de profil</div><button class="icon-btn" data-a="closesheet" aria-label="Fermer">✕</button></div>'+
   presetGrid('setpreset')+'<input type="file" accept="image/*" id="photofile2" hidden><button class="btn primary" data-a="pickphoto" style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px">'+ico(I.camera,20)+'Envoyer ma propre photo</button></div></div>';
 }
 if(s.kind==='photo'){
  var lb=sideLabel(s.side);
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Photo '+lb.toLowerCase()+'"><div class="name" style="font-size:17px">Photo du '+lb.toLowerCase()+'</div>'+
   '<p class="muted" style="margin:6px 0 14px 0">'+(s.after?'Recto validé ✓. Maintenant le verso : ':'')+'Veux-tu ouvrir l\'appareil photo ?</p>'+
   '<div class="stack"><button class="btn primary" data-a="photocam">Ouvrir l\'appareil photo</button><button class="btn" data-a="photogal">Choisir dans la galerie</button><button class="btn ghost" data-a="closesheet">'+(s.after?'Plus tard':'Annuler')+'</button></div>'+
   '<input type="file" accept="image/*" capture="environment" id="sf-cam" hidden><input type="file" accept="image/*" id="sf-gal" hidden></div></div>';
 }
 if(s.kind==='photocheck'){
  var lb2=sideLabel(s.side);
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Vérifier la photo"><div class="name" style="font-size:17px">'+lb2+' : la photo vous convient ?</div>'+
   '<div class="pcheck"><img src="'+esc(s.url)+'" alt="Aperçu de la photo du '+lb2.toLowerCase()+'"></div>'+
   '<p class="note" style="margin:6px 0 12px 0">Carte entière, bien à plat, texte lisible, sans reflet.</p>'+
   '<div class="row2"><button class="btn" data-a="photoredo">Refaire</button><button class="btn primary" data-a="photook">Valider</button></div></div></div>';
 }
 if(s.kind==='del'){
  return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Retirer"><div class="name" style="font-size:17px">Retirer cet item ?</div><p class="muted">'+esc(s.name)+' sera supprimé de tes cartes.</p><div class="row2" style="margin-top:12px"><button class="btn" data-a="closesheet">Annuler</button><button class="btn primary" data-a="delok">Retirer</button></div></div></div>';
 }
 return '<div class="sheet-bg" data-a="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Ta zone"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="name" style="font-size:17px">Ta zone</div><button class="icon-btn" data-a="closesheet" aria-label="Fermer">'+ico(I.close)+'</button></div>'+zonePicker()+'<button class="btn primary" style="margin-top:14px" data-a="savezone"'+(S.zonePick?'':' disabled')+'>Enregistrer</button></div></div>';
}

/* ---------- rendu ---------- */
function viewKey(){
 var t=top();
 return [S.phase,S.tab,t?t.name+(t.id||''):''].join('|');
}
/* mise à jour sur place : le champ en cours de saisie n'est jamais remplacé, donc le clavier reste ouvert */
function morphKids(a,b){
 var i=0;
 while(i<b.childNodes.length){
  var nb=b.childNodes[i],na=a.childNodes[i];
  if(!na){a.appendChild(nb.cloneNode(true));i++;continue;}
  if(na.nodeType!==nb.nodeType||na.nodeName!==nb.nodeName){a.replaceChild(nb.cloneNode(true),na);i++;continue;}
  if(nb.nodeType===3||nb.nodeType===8){if(na.nodeValue!==nb.nodeValue){na.nodeValue=nb.nodeValue;}i++;continue;}
  if(na===document.activeElement&&/^(INPUT|TEXTAREA)$/.test(na.nodeName)){i++;continue;}
  var j,at;
  for(j=na.attributes.length-1;j>=0;j--){at=na.attributes[j].name;if(!nb.hasAttribute(at)){na.removeAttribute(at);}}
  for(j=0;j<nb.attributes.length;j++){at=nb.attributes[j];if(na.getAttribute(at.name)!==at.value){na.setAttribute(at.name,at.value);}}
  if(na.nodeName==='INPUT'){if(na.type==='checkbox'||na.type==='radio'){na.checked=nb.hasAttribute('checked');}else if(na.value!==(nb.getAttribute('value')||'')){na.value=nb.getAttribute('value')||'';}}
  else if(na.nodeName==='SELECT'||na.nodeName==='TEXTAREA'){na.innerHTML=nb.innerHTML;if(na.nodeName==='TEXTAREA'){na.value=nb.value;}}
  else{morphKids(na,nb);}
  i++;
 }
 while(a.childNodes.length>b.childNodes.length){a.removeChild(a.lastChild);}
}
function render(){
 var app=$('#app'),html='';
 TK.map.destroy();
 clearInterval(S.poll);S.poll=0;
 var p=S.phase;
 if(p==='boot'){html=vBoot();}
 else if(p==='landing'){html=vLanding();}
 else if(p==='signup'||p==='login'||p==='forgot'||p==='recover'){html=vAuth();}
 else if(p==='notice'){html=vNotice();}
 else if(p==='fatal'){html=vFatal();}
 else if(p==='photo'){html=vPhoto();}
 else if(p==='energy'){html=vEnergy();}
 else if(p==='zone'){html=vZone();}
 else{
  var t=top(),body='';
  if(t){
   if(t.name==='item'){body=vItem(t);}
   else if(t.name==='profile'){body=vProfileOther(t);}
   else if(t.name==='add'){body=vAdd();}
   else if(t.name==='propose'){body=vPropose(t);}
   else if(t.name==='proposal'){body=vProposal(t);}
  }else if(S.tab==='carte'){body=vCarte();}
  else if(S.tab==='listes'){body=vListes();}
  else if(S.tab==='echanges'){body=vEchanges();}
  else{body=vProfil();}
  html='<div class="shell">'+side()+'<main class="main">'+body+'</main>'+tabbar()+'</div>';
 }
 if(S.sheet){html+=vSheet();}
 if(S.light){html+='<div class="lightbox" data-a="closelight" role="dialog" aria-label="Photo agrandie"><img alt="" data-n="?" onerror="TK_imgFallback(this)" src="'+esc(S.light)+'"></div>';}
 var fo=document.activeElement,fid=fo&&fo.id&&/^(aq|zq|msearch|msgin|scustom|f-)/.test(fo.id)?fo.id:null,fpos=fid&&fo.selectionStart!=null?fo.selectionStart:null;
 var key=viewKey(),prev=$('.scroll'),pos=(prev&&key===S.lastKey)?prev.scrollTop:0;
 var anc=null;
 if(prev&&key===S.lastKey){var pr0=prev.getBoundingClientRect(),els0=prev.querySelectorAll('[data-a=pickcard]');for(var ai=0;ai<els0.length;ai++){var r0=els0[ai].getBoundingClientRect();if(r0.bottom>pr0.top+10){anc={v:els0[ai].getAttribute('data-v'),top:r0.top};break;}}}
 var keepImg=[];app.querySelectorAll('img').forEach(function(im){if(im.complete&&im.naturalWidth>0){keepImg.push(im);}});
 if(fid){var tmp=document.createElement('div');tmp.innerHTML=html;morphKids(app,tmp);}else{app.innerHTML=html;}S.lastKey=key;
 if(keepImg.length){app.querySelectorAll('img').forEach(function(ni){for(var ki=0;ki<keepImg.length;ki++){if(keepImg[ki]&&keepImg[ki].getAttribute('src')===ni.getAttribute('src')&&keepImg[ki].className===ni.className){ni.parentNode.replaceChild(keepImg[ki],ni);keepImg[ki]=null;break;}}});}
 var sc=$('.scroll');if(sc&&pos){sc.scrollTop=pos;}
 /* garde la carte visible au même endroit quand la sélection s'insère au-dessus de la liste */
 if(sc&&anc){var els1=sc.querySelectorAll('[data-a=pickcard]');for(var bi=0;bi<els1.length;bi++){if(els1[bi].getAttribute('data-v')===anc.v){sc.scrollTop+=els1[bi].getBoundingClientRect().top-anc.top;break;}}}
 if(fid){var n=document.getElementById(fid);if(n){n.focus();if(fpos!=null&&n.setSelectionRange){try{n.setSelectionRange(fpos,fpos);}catch(e){}}}}
 if(p==='app'){
  var tt=top();
  if(!tt&&S.tab==='carte'){mountMap();}
  if(tt&&tt.name==='proposal'){var ch=$('#chat');if(ch){ch.scrollTop=ch.scrollHeight;}S.poll=setInterval(pollTick,8000);}
 }
}

/* ---------- chargement ---------- */
async function loadMine(){
 var items=await DB.listMine();try{await TK.catalog.enrich(items);}catch(e){}
 S.my.offers=items.filter(function(i){return i.kind==='offer';});
 S.my.wants=items.filter(function(i){return i.kind==='want';});
}
async function loadProps(){try{S.props=await DB.listProposals();}catch(e){toast(TK.frError(e));}}
var loadP=null;
function loadUser(){
 if(loadP){return loadP;}
 loadP=(async function(){
  try{
   var u=await DB.getProfile(DB.uid());
   if(!u){throw new Error('Profil introuvable. Le fichier supabase/schema.sql a-t-il bien été exécuté ?');}
   S.user=u;S.energy=u.energy||null;applyTheme();
   await loadMine();
   if(u.zone_lat!=null){S.mv={lat:u.zone_lat,lng:u.zone_lng,z:11};}
   S.tab='carte';S.stack=[];S.err='';
   S.phase=S.recover?'recover':u.onboarded?'app':'photo';
  }catch(e){S.err=TK.frError(e);S.phase='fatal';}
  loadP=null;render();
 })();
 return loadP;
}
async function pollTick(){
 var t=top();if(!t||t.name!=='proposal'){return;}
 try{
  S.msgs=await DB.listMessages(t.id);
  var old=S.props.filter(function(x){return x.id===t.id;})[0],props=await DB.listProposals(),nw=props.filter(function(x){return x.id===t.id;})[0];
  S.props=props;
  if(old&&nw&&old.status!==nw.status){render();return;}
  var ch=$('#chat');if(ch){var atEnd=ch.scrollTop+ch.clientHeight>=ch.scrollHeight-30;ch.innerHTML=msgHtml();if(atEnd){ch.scrollTop=ch.scrollHeight;}}
 }catch(e){}
}

/* ---------- actions ---------- */
function geolocate(cb){
 if(!navigator.geolocation){toast('Localisation indisponible sur cet appareil. Cherche une ville.');return;}
 toast('Localisation en cours…');
 navigator.geolocation.getCurrentPosition(function(pos){cb(pos.coords.latitude,pos.coords.longitude);},function(){toast('Localisation refusée ou indisponible. Cherche une ville.');},{enableHighAccuracy:false,timeout:8000,maximumAge:600000});
}
async function saveProfile(patch){
 try{S.user=await DB.updateProfile(patch);return true;}catch(e){toast(TK.frError(e));return false;}
}
async function setValue(n){
 var id=S.sheet&&S.sheet.id;if(!id){return;}
 try{
  var upd=await DB.updateItem(id,{value_eur:n,value_source:n==null?null:'user',value_at:n==null?null:new Date().toISOString()});
  var t=top();if(t&&t.data&&t.data.id===id){Object.assign(t.data,upd||{});}
  S.sheet=null;await loadMine();render();toast('Estimation enregistrée');
 }catch(e){toast(TK.frError(e));}
}
async function setAvatar(file){
 if(!/^image\//.test(file.type)){toast('Choisis un fichier image.');return;}
 try{
  toast('Envoi de la photo…');
  var blob=await TK.shrink(file,480),url=await DB.uploadPhoto(blob,'avatar');
  if(await saveProfile({avatar_url:url})){if(S.sheet&&S.sheet.kind==='avatar'){S.sheet=null;}render();}
 }catch(e){toast(TK.frError(e));}
}
function goto(phase){S.phase=phase;S.err='';render();}
async function openItem(id){
 var t={name:'item',id:id,data:null,img:0};nav(t);
 try{t.data=await DB.getItem(id);}catch(e){t.err=TK.frError(e);}
 if(top()===t){render();}
 if(t.data&&t.data.user_id&&(!S.user||t.data.user_id!==S.user.id)){
  try{t.stats=await DB.getStats(t.data.user_id);if(top()===t){render();}}catch(e){}
 }
 if(t.data&&t.data.type==='loose'&&t.data.card_id&&String(t.data.card_id).indexOf('d')!==0){
  try{var lv=await TK.catalog.detail(t.data.card_id);if(lv){t.live=lv;if(lv.doubt&&S.user&&t.data.user_id===S.user.id&&t.data.value_source==='cardmarket'){try{var up=await DB.updateItem(t.data.id,{value_eur:null,value_source:null,value_at:null});Object.assign(t.data,up||{value_eur:null,value_source:null});loadMine();}catch(e6){}}if(top()===t){render();}}}catch(e){}
 }
}
async function openProfile(id){
 var t={name:'profile',id:id,data:null,tab:'offers'};nav(t);
 try{
  var r=await Promise.all([DB.getProfile(id),DB.listOfUser(id),DB.getStats(id).catch(function(){return null;}),DB.listReviews(id).catch(function(){return [];})]);
  if(!r[0]){throw new Error('Profil introuvable.');}
  try{await TK.catalog.enrich(r[1]);}catch(e){}
  t.data={profile:r[0],items:r[1],stats:r[2],reviews:r[3]};
 }catch(e){t.err=TK.frError(e);}
 if(top()===t){render();}
}
async function openPropose(toId,preItem){
 var t={name:'propose',id:toId,loaded:false,to:null,theirs:[],give:[],get:[],handover:'main',sending:false};nav(t);
 try{
  var r=await Promise.all([DB.getProfile(toId),DB.listOfUser(toId)]);
  try{await TK.catalog.enrich(r[1]);}catch(e){}
  t.to=r[0];t.theirs=r[1];
  var m=matchFor(t.theirs);
  t.give=m.gives.map(function(w){return S.my.offers.filter(function(o){return o.match_key===w.match_key;})[0];}).filter(Boolean).map(function(i){return i.id;});
  t.get=preItem?[preItem]:m.gets.map(function(i){return i.id;});
  t.loaded=true;
 }catch(e){toast(TK.frError(e));S.stack.pop();}
 render();
}
async function openProposal(id){
 var t={name:'proposal',id:id};
 S.msgs=[];nav(t);
 try{S.msgs=await DB.listMessages(id);}catch(e){}
 await loadReviewState(id);
 if(top()===t){render();}
}
async function loadReviewState(pid){
 var pr=S.props.filter(function(x){return x.id===pid;})[0];
 if(!pr||pr.status!=='done'){S.rev=null;return;}
 try{var mine=await DB.myReviewFor(pid);S.rev={pid:pid,mine:mine||null,rating:0,comment:''};}catch(e){S.rev=null;}
}
function startAdd(kind){
 S.add={kind:kind,type:'loose',q:'',setId:'',byId:{},setCards:{},setLoad:{},results:null,hint:'',shown:60,sel:{},busy:null,tok:0,loading:false,err:'',picked:null,price:null,saving:false,
  f:{variant:'',condition:'Near Mint',company:'PSA',grade:'',cert:'',notes:'',sealedKind:TK.SEALED_KINDS[0],custom:'',name:'',number:'',setName:'',value:''},photos:{front:null,back:null}};
 nav({name:'add'});
 TK.catalog.sets().then(function(s){S.sets=s;if(top()&&top().name==='add'){render();}}).catch(function(e){S.add.err=TK.frError(e);render();});
}
async function runSearch(live){
 var a=S.add,qq=a.q.trim();
 if(!qq&&!a.setId){if(!live){a.err='Entre un nom de carte ou choisis une série.';}a.results=null;a.hint='';a.loading=false;render();return;}
 var tok=a.tok=(a.tok||0)+1;
 a.err='';a.loading=true;if(!live||a.results==null){render();}
 try{
  var r=await TK.catalog.search(qq,a.setId);
  if(a.tok!==tok||S.add!==a){return;}
  a.results=r.list;a.hint=r.hint||'';a.shown=60;
 }catch(e){if(a.tok!==tok||S.add!==a){return;}a.err=TK.frError(e);a.results=null;}
 a.loading=false;render();
}
TK.catalog.onAbbr=debounce(function(){if(S.add&&!S.add.picked){render();}},600);
TK.catalog.onIndex=function(){var a=S.add;if(a&&a.type!=='sealed'&&!a.picked&&a.q.trim().length>=2){runSearch(true);}};
var liveSearch=debounce(function(){var a=S.add;if(!a||a.picked){return;}if(a.type==='sealed'){render();return;}if(a.q.trim().length>=2||a.setId){runSearch(true);}else if(!a.q.trim()&&!a.setId){a.results=null;a.hint='';render();}},350);
function pickCard(c,d){
 var a=S.add;a.picked=c;a.price=null;a.f.variant='';
 function apply(x){a.price=x;if(x&&x.variants&&x.variants.length&&!a.f.variant){a.f.variant=x.variants[0];}}
 if(d){apply(d);render();return;}
 render();
 if(!c.manual&&!c.sealed&&c.card_id&&c.card_id.indexOf('d')!==0){
  TK.catalog.detail(c.card_id).then(function(x){
   if(!x||S.add!==a||a.picked!==c){return;}
   apply(x);render();
  });
 }else if(!c.manual&&c.val){apply({price:c.val,priceFoil:c.val,updated:new Date().toISOString(),image:null,variants:['Normale','Reverse'],low:false});render();}
}
function foilVariant(v){return /reverse|holo/i.test(String(v||''));}
async function submitMulti(){
 var a=S.add,offer=a.kind==='offer',ids=Object.keys(a.sel);
 if(a.saving||!ids.length){return;}
 a.saving=true;render();
 var done=0;
 try{
  for(var i=0;i<ids.length;i++){
   var t=a.sel[ids[i]],c=t.card,d=t.detail,vs=t.picked.length?t.picked:[null];
   for(var j=0;j<vs.length;j++){for(var q=0;q<(t.qty||1);q++){
    var v=vs[j],pr=foilVariant(v)?(d.priceFoil||d.price):(d.price||d.priceFoil);
    var row={kind:a.kind,type:c.sealed?'sealed':'loose',name:c.name,number:c.number||null,set_id:c.set_id||null,set_name:c.set_name||null,set_abbr:c.set_abbr||TK.catalog.abbr(c.set_id)||null,
     card_id:c.sealed?null:c.card_id,catalog_image:c.image||null,variant:v,condition:(offer&&!c.sealed)?a.f.condition:null,grade_company:null,grade:null,cert:null,
     value_eur:pr>0?pr:null,value_source:pr>0?'cardmarket':null,value_at:pr>0?d.updated:null,notes:null,photo_front:null,photo_back:null,photo_optional:offer&&!c.sealed};
    row.match_key=TK.matchKey(row);
    await DB.addItem(row);done++;
   }}
  }
  await loadMine();
  S.add=null;S.stack=[];S.tab='listes';S.listTab=offer?'offers':'wants';
  ids.forEach(function(k){var sn=a.sel[k].card.set_name||'Autres';S.open['me-'+S.listTab+'|'+sn]=true;});
  render();toast(done+' item'+(done>1?'s ajoutés':' ajouté'));
 }catch(e){a.saving=false;render();toast((done?done+' ajouté(s), puis erreur : ':'')+TK.frError(e));}
}
async function submitAdd(){
 var a=S.add,f=a.f,p=a.picked,type=a.type,offer=a.kind==='offer';
 if(addMissing().length||a.saving){return;}
 a.saving=true;refreshAddBtn();$('#addbtn').textContent='Envoi…';
 try{
  var front=null,back=null;
  if(offer&&a.photos.front&&a.photos.back){
   var urls=await Promise.all([DB.uploadPhoto(a.photos.front.blob,'front'),DB.uploadPhoto(a.photos.back.blob,'back')]);
   front=urls[0];back=urls[1];
  }
  var vsel=type==='loose'&&f.variant?f.variant:null;
  var pr=a.price?(foilVariant(vsel)?(a.price.priceFoil||a.price.price):a.price.price):null;
  var auto=type==='loose'&&pr>0,uv=auto?0:parseEur(f.value);
  var row={
   kind:a.kind,type:type,
   name:p.manual?f.name.trim():p.name,number:p.manual?(f.number.trim()||null):(p.number||null),
   set_id:p.set_id||null,set_name:p.manual?(f.setName.trim()||null):(p.set_name||null),
   card_id:(p.manual||type==='sealed')?null:p.card_id,catalog_image:p.image||null,
   condition:type==='loose'?f.condition:null,grade_company:type==='graded'?f.company:null,grade:type==='graded'?(f.grade.trim()||null):null,cert:type==='graded'?(f.cert.trim()||null):null,
   value_eur:auto?pr:uv>0?uv:null,value_source:auto?'cardmarket':uv>0?'user':null,value_at:auto?a.price.updated:uv>0?new Date().toISOString():null,
   notes:f.notes.trim()||null,photo_front:front,photo_back:back,
   set_abbr:p.manual?null:(p.set_abbr||TK.catalog.abbr(p.set_id)||null),variant:vsel,photo_optional:offer&&type==='loose'&&!front&&!back
  };
  row.match_key=TK.matchKey(row);
  await DB.addItem(row);
  await loadMine();
  S.add=null;S.stack=[];S.tab='listes';S.listTab=offer?'offers':'wants';
  S.open['me-'+S.listTab+'|'+(row.set_name||'Autres')]=true;
  render();toast('Ajouté à '+(offer?'Je propose':'Je recherche'));
 }catch(e){a.saving=false;render();toast(TK.frError(e));}
}

var ACT={
 goto:function(v){goto(v);},
 energy:function(v){
  S.energy=v;applyTheme();
  if(S.phase==='app'){saveProfile({energy:v});}
  render();
 },
 saveenergy:async function(){if(await saveProfile({energy:S.energy})){S.zonePick=null;S.zoneRes=[];S.zoneQ='';goto('zone');}},
 pickphoto:function(){var i=$('#photofile2')||$('#photofile');if(i){i.click();}},
 edititem:function(v){var t=top(),it=t&&t.data;if(!it){return;}S.sheet={kind:'edit',id:v,f:{condition:it.condition||'Near Mint',company:it.grade_company||'PSA',grade:it.grade||'',cert:it.cert||''},photos:{front:null,back:null}};render();},
 editphoto:function(v){
  var side=v;
  function setP(blob){var o=S.sheet&&S.sheet.photos[side];if(o){URL.revokeObjectURL(o.url);}if(S.sheet){S.sheet.photos[side]={blob:blob,url:URL.createObjectURL(blob)};render();}}
  function viaFile(){var i=$('#ef-'+side);if(i){i.click();}}
  if(!TK.camera.supported()){viaFile();return;}
  TK.camera.open({hint:'Place la '+(side==='front'?'face avant':'face arrière')+' dans le cadre, bien à plat',onShot:setP,onGallery:function(f){TK.shrink(f,1400).then(setP).catch(function(err){toast(TK.frError(err));});},onFail:function(){toast('Caméra indisponible : choisis une photo dans la galerie.');viaFile();}});
 },
 saveedit:async function(){
  var s=S.sheet,t=top(),it=t&&t.data;if(!s||s.kind!=='edit'||!it||s.saving){return;}
  s.saving=true;render();
  try{
   var patch={};
   if(it.type==='loose'){patch.condition=s.f.condition;}
   if(it.type==='graded'){patch.grade_company=s.f.company;patch.grade=(s.f.grade||'').trim()||null;patch.cert=(s.f.cert||'').trim()||null;}
   if(s.photos.front){patch.photo_front=await DB.uploadPhoto(s.photos.front.blob,'front');}
   if(s.photos.back){patch.photo_back=await DB.uploadPhoto(s.photos.back.blob,'back');}
   var upd=await DB.updateItem(it.id,patch);
   Object.assign(it,upd||patch);t.img=0;
   S.sheet=null;await loadMine();render();toast('Modifications enregistrées');
  }catch(e){if(S.sheet===s){s.saving=false;}render();toast(TK.frError(e));}
 },
 editvalue:function(v){var t=top();var it=t&&t.data;S.sheet={kind:'value',id:v,cur:it&&it.value_eur!=null?Number(it.value_eur):null};render();},
 savevalue:async function(){var n=parseEur(($('#valin')||{}).value);if(!n){toast('Entre un montant valide.');return;}await setValue(n);},
 clearvalue:async function(){await setValue(null);},
 editavatar:function(){S.sheet={kind:'avatar'};render();},
 setpreset:async function(v){if(await saveProfile({avatar_url:'preset:'+(+v)})){if(S.sheet&&S.sheet.kind==='avatar'){S.sheet=null;}render();}},
 photonext:async function(){
  if(!S.user.avatar_url){if(!(await saveProfile({avatar_url:'preset:'+Math.floor(Math.random()*PRESETS.length)}))){return;}}
  goto('energy');
 },
 logout:async function(){
  try{await DB.signOut();}catch(e){}
  S.user=null;S.stack=[];S.sheet=null;S.my={offers:[],wants:[]};S.props=[];S.energy=null;S.geo=null;S.mapProfiles=[];S.recover=false;
  applyTheme();goto('landing');
 },
 tab:function(v){
  S.tab=v;S.stack=[];S.sheet=null;
  if(v==='profil'&&S.user){Promise.all([DB.getStats(S.user.id),DB.listReviews(S.user.id)]).then(function(r){S.myStats=r[0];S.myReviews=r[1];if(S.tab==='profil'&&!top()){render();}}).catch(function(){});}
  if(v==='echanges'){render();loadProps().then(function(){if(S.tab==='echanges'&&!top()){render();}});return;}
  render();
 },
 back:function(){var t=top();if(!t){return;}if(t._h){history.back();}else{S.stack.pop();render();}},
 mode:function(v){
  S.mode=v;
  document.querySelectorAll('[data-a="mode"]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===v));});
  syncMap();
 },
 place:function(v){
  var p=S.sugg[+v];if(!p){return;}
  var inp=$('#msearch');if(inp){inp.value=p.n;inp.blur();}
  S.sugg=[];S.cardSugg=[];showSugg();if(S.itemFilter){setItemFilter(null);}TK.map.flyTo(p.lat,p.lng,p.z);
 },
 grpall:function(v){
  var a=v.split('|'),open=a.pop()==='1',key=a.join('|');
  document.querySelectorAll('details.grp').forEach(function(d){if((d.getAttribute('data-gk')||'').indexOf(key+'|')===0){d.open=open;S.open[d.getAttribute('data-gk')]=open;}});
 },
 cardsel:function(v){
  var g=S.cardSugg[+v];if(!g||!S.lastSearch){return;}
  var items=g.items,ids={};items.forEach(function(i){ids[i.user_id]=1;});
  var lbl=g.all?g.q:(g.sample.name+(g.sample.number?' ('+g.sample.number+')':''));
  var inp=$('#msearch');if(inp){inp.value=lbl;inp.blur();}
  S.sugg=[];S.cardSugg=[];showSugg();
  setItemFilter({label:lbl,items:items,profiles:S.lastSearch.profiles.filter(function(p){return ids[p.id];})});
 },
 clearfilter:function(){var inp=$('#msearch');if(inp){inp.value='';}setItemFilter(null);},
 locate:function(){
  geolocate(function(lat,lng){
   S.geo={lat:TK.zoneRound(lat),lng:TK.zoneRound(lng)};
   TK.map.setMe(S.geo);TK.map.flyTo(S.geo.lat,S.geo.lng,12);toast('Position approximative affichée');
  });
 },
 profile:function(v){openProfile(v);},
 ptab:function(v){top().tab=v;render();},
 rate:function(v){if(S.rev){var tx=$('#revtxt');if(tx){S.rev.comment=tx.value;}S.rev.rating=parseInt(v,10);render();}},
 sendreview:async function(){
  var t=top(),pr=S.props.filter(function(x){return x.id===t.id;})[0];if(!pr||!S.rev||!S.rev.rating){return;}
  var tx=$('#revtxt'),c=tx?tx.value.trim():'';
  try{await DB.addReview(pr.id,pr.from_user===S.user.id?pr.to_user:pr.from_user,S.rev.rating,c);S.rev.mine={rating:S.rev.rating,comment:c};render();toast('Avis publié');}
  catch(e){toast(TK.frError(e));}
 },
 item:function(v){openItem(v);},
 gimg:function(v){top().img=+v;render();},
 light:function(v){var t=top(),imgs=[t.data.photo_front,t.data.photo_back].filter(Boolean);S.light=imgs[+v]||TK.catImg(t.data,'high')||'';if(S.light){render();}},
 closelight:function(){S.light=null;render();},
 ltab:function(v){S.listTab=v;render();},
 add:function(v){startAdd(v);},
 atype:function(v){var a=S.add;a.type=v;a.q='';a.results=null;a.hint='';a.err='';render();},
 asearch:function(){runSearch(false);},
 more:function(){S.add.shown+=60;render();},
 pickcard:async function(v){
  var a=S.add,c=a.byId&&a.byId[v];if(!c){return;}
  if(a.type==='graded'){pickCard(c);return;}
  if(a.sel[c.card_id]){delete a.sel[c.card_id];render();return;}
  var offer=a.kind==='offer';
  if(c.sealed){
   if(offer){toast('Un produit scellé demande des photos : on l\'ajoute seul.');pickCard(c,null);return;}
   a.sel[c.card_id]={card:c,detail:{price:null,priceFoil:null,updated:new Date().toISOString(),variants:[],low:true},picked:[],qty:1};render();return;
  }
  a.busy=c.card_id;render();
  var d=await TK.catalog.detail(c.card_id);
  if(!d){d=await TK.catalog.detail(c.card_id);}
  a.busy=null;if(S.add!==a){return;}
  if(offer&&d&&!d.low){toast('Cette carte demande des photos : on l\'ajoute seule.');pickCard(c,d||null);return;}
  var dd=d||{price:null,priceFoil:null,updated:new Date().toISOString(),variants:['Normale','Reverse'],low:true};
  a.sel[c.card_id]={card:c,detail:dd,picked:offer?[dd.variants[0]]:[],qty:1,dflt:offer};
  render();
 },
 tqty:function(v){var i=v.lastIndexOf('|'),id=v.slice(0,i),d=+v.slice(i+1),t=S.add.sel[id];if(!t){return;}t.qty=Math.min(9,Math.max(1,(t.qty||1)+d));render();},
 tdel:function(v){delete S.add.sel[v];render();},
 tvar:function(v){
  var i=v.indexOf('|'),id=v.slice(0,i),lab=v.slice(i+1),t=S.add.sel[id];if(!t){return;}
  t.dflt=false;
  var k=t.picked.indexOf(lab);if(k>-1){t.picked.splice(k,1);}else{t.picked.push(lab);}render();
 },
 tvart:function(v){
  var i=v.indexOf('|'),id=v.slice(0,i),lab=v.slice(i+1),t=S.add.sel[id];if(!t){return;}
  if(t.dflt){t.picked=[];}t.dflt=false;
  var k=t.picked.indexOf(lab);if(k>-1){t.picked.splice(k,1);}else{t.picked.push(lab);}render();
 },
 svar:function(v){S.add.f.variant=(S.add.f.variant===v&&S.add.kind==='want')?'':v;render();},
 addmulti:function(){submitMulti();},
 picksealed:function(){
  var a=S.add,f=a.f;
  if(!a.setId){toast('Choisis une série.');return;}
  var name=f.custom.trim();
  if(!name){toast('Indique le nom du produit.');return;}
  var s=(S.sets||[]).filter(function(x){return x.id===a.setId;})[0];
  pickCard({card_id:null,name:name,number:null,set_id:a.setId,set_name:s?s.name:'',image:null});
 },
 manual:function(){pickCard({manual:true,name:'',number:null,set_id:null,set_name:'',image:null,card_id:null});},
 unpick:function(){S.add.picked=null;S.add.price=null;render();},
 pickside:function(v){
  if(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches){S.sheet={kind:'photo',side:v};render();return;}
  var i=$('#pf-'+v);if(i){i.click();}
 },
 photocam:function(){
  var sh=S.sheet;if(!sh){return;}var side=sh.side;
  function viaFile(){var i=$('#sf-cam');if(i){i.click();}}
  if(!TK.camera.supported()){viaFile();return;}
  TK.camera.open({
   hint:'Place la '+(side==='front'?'face avant':'face arrière')+' dans le cadre, bien à plat',
   onShot:function(blob){S.sheet={kind:'photocheck',side:side,blob:blob,url:URL.createObjectURL(blob)};render();},
   onGallery:function(f){TK.shrink(f,1400).then(function(blob){S.sheet={kind:'photocheck',side:side,blob:blob,url:URL.createObjectURL(blob)};render();}).catch(function(err){toast(TK.frError(err));});},
   onFail:function(){toast('Caméra indisponible : choisis une photo dans la galerie.');}
  });
 },
 photogal:function(){var i=$('#sf-gal');if(i){i.click();}},
 photoredo:function(){var s=S.sheet;if(s&&s.url){URL.revokeObjectURL(s.url);}S.sheet={kind:'photo',side:s.side};render();},
 photook:function(){
  var s=S.sheet,a=S.add;if(!s||!a){return;}
  var old=a.photos[s.side];if(old){URL.revokeObjectURL(old.url);}
  a.photos[s.side]={blob:s.blob,url:s.url};
  S.sheet=(s.side==='front'&&!a.photos.back)?{kind:'photo',side:'back',after:true}:null;
  render();
 },
 addsubmit:function(){submitAdd();},
 del:function(v){
  var all=S.my.offers.concat(S.my.wants),it=all.filter(function(x){return x.id===v;})[0];
  S.sheet={kind:'del',id:v,name:it?it.name:'Cet item'};render();
 },
 delok:async function(){
  var id=S.sheet.id;
  try{await DB.removeItem(id);await loadMine();S.sheet=null;
   if(top()&&top().name==='item'){S.stack=[];S.tab='listes';}
   render();toast('Item retiré');}
  catch(e){toast(TK.frError(e));}
 },
 closesheet:function(){S.sheet=null;render();},
 backdrop:function(v,el,e){if(e.target===el){S.sheet=null;render();}},
 propose:function(v,el){openPropose(v,el.getAttribute('data-item'));},
 toggle:function(v,el){var t=top(),a=t[el.getAttribute('data-k')],i=a.indexOf(v);if(i>-1){a.splice(i,1);}else{a.push(v);}render();},
 handover:function(v){top().handover=v;render();},
 send:async function(){
  var t=top();if(t.sending){return;}
  t.sending=true;render();
  try{
   var gv=S.my.offers.filter(function(i){return t.give.indexOf(i.id)>-1;}),rv=t.theirs.filter(function(i){return t.get.indexOf(i.id)>-1;});
   var pr=await DB.createProposal({to_user:t.id,give:gv.map(snap),get:rv.map(snap),give_value:sumVal(gv),get_value:sumVal(rv),handover:t.handover});
   await loadProps();
   S.stack=[];S.tab='echanges';render();toast('Proposition envoyée');
   openProposal(pr.id);
  }catch(e){t.sending=false;render();toast(TK.frError(e));}
 },
 proposal:function(v){openProposal(v);},
 pstatus:async function(v){
  var t=top();
  try{await DB.setProposalStatus(t.id,v);await loadProps();if(v==='done'){await loadReviewState(t.id);}render();}
  catch(e){toast(TK.frError(e));}
 },
 demoreply:async function(){var t=top();await DB.demoReply(t.id,'accepted');await loadProps();S.msgs=await DB.listMessages(t.id);render();},
 geoloc:function(){
  geolocate(async function(lat,lng){
   var label='Ma position (arrondie)';
   try{var r=await fetch('https://geo.api.gouv.fr/communes?lat='+lat+'&lon='+lng+'&fields=nom&limit=1');if(r.ok){var j=await r.json();if(j[0]&&j[0].nom){label=j[0].nom;}}}catch(e){}
   S.zonePick={label:label,lat:lat,lng:lng};render();
  });
 },
 zonepick:function(v){var p=S.zoneRes[+v];if(!p){return;}S.zonePick={label:p.base||p.n,lat:p.lat,lng:p.lng};S.zoneRes=[];S.zoneQ=p.n;render();},
 savezone:async function(){
  if(!S.zonePick){return;}
  var onboarding=S.phase==='zone',patch={zone_label:S.zonePick.label,zone_lat:S.zonePick.lat,zone_lng:S.zonePick.lng};
  if(onboarding){patch.onboarded=true;if(!S.user.avatar_url){patch.avatar_url='preset:'+Math.floor(Math.random()*PRESETS.length);}}
  if(await saveProfile(patch)){
   S.mv={lat:S.user.zone_lat,lng:S.user.zone_lng,z:11};S.sheet=null;S.zonePick=null;
   if(onboarding){S.phase='app';S.tab='carte';}
   render();toast('Zone enregistrée');
  }
 },
 skipzone:async function(){var pt={onboarded:true};if(!S.user.avatar_url){pt.avatar_url='preset:'+Math.floor(Math.random()*PRESETS.length);}if(await saveProfile(pt)){S.phase='app';S.tab='carte';render();}},
 editzone:function(){S.zonePick=null;S.zoneRes=[];S.zoneQ='';S.sheet={kind:'zone'};render();}
};

/* ---------- événements ---------- */
document.addEventListener('click',function(e){
 var el=e.target.closest('[data-a]');if(!el){return;}
 var f=ACT[el.getAttribute('data-a')];
 if(f){f(el.getAttribute('data-v'),el,e);}
});
document.addEventListener('submit',async function(e){
 e.preventDefault();
 var f=e.target;
 if(f.id==='msgform'){
  var inp=$('#msgin'),body=inp.value.trim(),t=top();if(!body||!t){return;}
  inp.value='';
  try{await DB.sendMessage(t.id,body);S.msgs=await DB.listMessages(t.id);var ch=$('#chat');if(ch){ch.innerHTML=msgHtml();ch.scrollTop=ch.scrollHeight;}}
  catch(err){inp.value=body;toast(TK.frError(err));}
  return;
 }
 if(f.id!=='authform'){return;}
 var p=S.phase,signup=p==='signup',forgot=p==='forgot',rec=p==='recover';
 var email=f.elements.email?f.elements.email.value.trim():'',pw=f.elements.password?f.elements.password.value:'',pseudo=signup?f.elements.pseudo.value.trim():'';
 S.form={pseudo:pseudo,email:email};
 if(signup&&!/^[\p{L}\p{N}_.-]{3,20}$/u.test(pseudo)){S.err='Ton pseudo doit faire 3 à 20 caractères, sans espace.';render();return;}
 if(!rec&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){S.err='Vérifie ton adresse email.';render();return;}
 if((signup||rec)&&pw.length<8){S.err='Le mot de passe doit faire au moins 8 caractères.';render();return;}
 if(p==='login'&&!pw){S.err='Saisis ton mot de passe.';render();return;}
 var btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Patiente…';
 try{
  if(signup){
   var r=await DB.signUp(email,pw,pseudo);
   if(r.needsConfirm){S.notice={title:'Vérifie ta boîte mail',text:'On t\'a envoyé un lien de confirmation à '+email+'. Clique dessus, puis reviens te connecter ici.'};S.err='';S.phase='notice';render();return;}
   await loadUser();
  }else if(forgot){
   await DB.resetPassword(email);
   S.notice={title:'Email envoyé',text:'Si un compte existe pour '+email+', tu vas recevoir un lien pour choisir un nouveau mot de passe.'};S.err='';S.phase='notice';render();
  }else if(rec){
   await DB.updatePassword(pw);S.recover=false;toast('Mot de passe mis à jour');await loadUser();
  }else{
   await DB.signIn(email,pw);await loadUser();
  }
 }catch(err){S.err=TK.frError(err);render();}
});
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.classList&&d.classList.contains('grp')){var gk0=d.getAttribute('data-gk'),was=!!S.open[gk0];S.open[gk0]=d.open;if(d.open!==was&&/^s[ke]\|/.test(gk0)&&S.add){render();}if(d.open&&d.getAttribute('data-set')&&S.add&&!S.add.picked){loadSetCards(d.getAttribute('data-set'));}}},true);
document.addEventListener('input',function(e){
 var t=e.target;
 if(t.getAttribute&&t.getAttribute('data-ef')&&S.sheet&&S.sheet.kind==='edit'){S.sheet.f[t.getAttribute('data-ef')]=t.value;}
 if(t.id==='aq'){S.add.q=t.value;liveSearch();}
 if(t.id==='zq'){S.zoneQ=t.value;zoneSearch(t.value);}
 if(t.id==='zslider'){TK.map.setZoom(+t.value);$('#rlabel').textContent=radiusLabel(TK.map.radiusKm(+t.value));}
 if(t.id==='msearch'){mapSearch(t.value);}
 if(t.getAttribute&&t.getAttribute('data-f')&&S.add){S.add.f[t.getAttribute('data-f')]=t.value;refreshAddBtn();}
});
var zoneSearch=debounce(async function(q){
 S.zoneRes=q.trim()?await TK.geo.suggest(q):[];
 var el=$('#zres');if(el){el.innerHTML=zoneResHtml();el.hidden=!S.zoneRes.length;}var zh=$('#zhint');if(zh){zh.textContent=zoneHint(q,S.zoneRes);}
},250);
var mapSearch=debounce(async function(q){
 q=q.trim();
 if(!q){S.sugg=[];S.cardSugg=[];showSugg();return;}
 var r=await Promise.all([TK.geo.suggest(q),DB.searchItems(q).catch(function(){return {profiles:[],items:[]};})]);
 if(($('#msearch')||{}).value!==undefined&&$('#msearch').value.trim()!==q){return;}
 S.sugg=r[0];S.cardSugg=[];S.lastSearch=r[1];
 if(r[1].items.length){
  S.cardSugg=[{all:true,q:q,items:r[1].items,offers:0,wants:0}].concat(cardGroups(r[1].items).slice(0,6));
  S.cardSugg[0].profiles=r[1].profiles;
 }
 showSugg();
},300);
document.addEventListener('change',function(e){
 var t=e.target;
 if(t.id==='aset'){S.add.setId=t.value;if(S.add.type!=='sealed'){if(S.add.q.trim()||t.value){runSearch(true);}else{S.add.results=null;S.add.hint='';render();}}}
 if(t.getAttribute&&t.getAttribute('data-ef')&&S.sheet&&S.sheet.kind==='edit'){S.sheet.f[t.getAttribute('data-ef')]=t.value;}
 if(t.id==='ef-front'||t.id==='ef-back'){var es=t.id.slice(3),efl=t.files&&t.files[0];if(efl&&S.sheet&&S.sheet.kind==='edit'){TK.shrink(efl,1400).then(function(blob){if(S.sheet&&S.sheet.kind==='edit'){var o=S.sheet.photos[es];if(o){URL.revokeObjectURL(o.url);}S.sheet.photos[es]={blob:blob,url:URL.createObjectURL(blob)};render();}}).catch(function(err){toast(TK.frError(err));});}}
 if(t.id==='skind'){S.add.f.sealedKind=t.value;render();}
 else if(t.getAttribute&&t.getAttribute('data-f')&&S.add){S.add.f[t.getAttribute('data-f')]=t.value;refreshAddBtn();}
 if(t.id==='photofile'||t.id==='photofile2'){var file=t.files&&t.files[0];if(file){setAvatar(file);}}
 if(t.id==='sf-cam'||t.id==='sf-gal'){
  var sh=S.sheet,fl2=t.files&&t.files[0];if(!sh||sh.kind!=='photo'||!fl2){return;}
  if(!/^image\//.test(fl2.type)){toast('Choisis un fichier image.');return;}
  TK.shrink(fl2,1400).then(function(blob){
   if(!S.sheet||S.sheet.kind!=='photo'){return;}
   S.sheet={kind:'photocheck',side:sh.side,blob:blob,url:URL.createObjectURL(blob)};render();
  }).catch(function(err){toast(TK.frError(err));});
 }
 if(t.id==='pf-front'||t.id==='pf-back'){
  var side=t.id.slice(3),fl=t.files&&t.files[0];if(!fl){return;}
  if(!/^image\//.test(fl.type)){toast('Choisis un fichier image.');return;}
  TK.shrink(fl,1400).then(function(blob){
   var old=S.add.photos[side];if(old){URL.revokeObjectURL(old.url);}
   S.add.photos[side]={blob:blob,url:URL.createObjectURL(blob)};render();
  }).catch(function(err){toast(TK.frError(err));});
 }
});
document.addEventListener('keydown',function(e){
 if(e.key==='Escape'){
  if(S.light){S.light=null;render();return;}
  if(S.sheet){S.sheet=null;render();return;}
 }
 if(e.key==='Enter'){
  if(e.target.id==='aq'){e.preventDefault();runSearch(false);}
  if(e.target.id==='msearch'){
   e.preventDefault();
   var qq=e.target.value.trim();
   Promise.all([TK.geo.suggest(qq),DB.searchItems(qq).catch(function(){return {profiles:[],items:[]};})]).then(function(r){
    S.sugg=r[0];S.lastSearch=r[1];
    if(r[0].length&&!/^#?\d{1,4}(\/\d+)?$/.test(qq)){ACT.place(0);}
    else if(r[1].items.length){S.cardSugg=[{all:true,q:qq,items:r[1].items,offers:0,wants:0}];ACT.cardsel(0);}
    else{S.cardSugg=[];showSugg();toast('Aucun lieu ni carte trouvé pour cette recherche.');}
   });
  }
 }
});

/* ---------- démarrage ---------- */
(async function boot(){
 applyTheme();render();
 DB.onAuth(function(ev){
  setTimeout(function(){
   if(ev==='PASSWORD_RECOVERY'){S.recover=true;if(!loadP){S.phase='recover';S.err='';render();}}
   else if(ev==='SIGNED_OUT'&&S.phase==='app'){S.user=null;S.phase='landing';render();}
   else if(ev==='SIGNED_IN'&&!S.user&&S.phase!=='fatal'&&S.phase!=='boot'){loadUser();}
  },0);
 });
 try{
  var uid=await DB.init();
  if(uid){await loadUser();}else if(S.phase==='boot'){S.phase='landing';render();}
 }catch(e){S.err=TK.frError(e);S.phase='fatal';render();}
})();
})();
