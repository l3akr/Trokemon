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
 user:null,energy:'plante',tab:'carte',stack:[],
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
function label(it){return esc(it.name)+(it.number?' ('+esc(it.number)+')':'');}
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
 var e=ENERGIES.filter(function(x){return x.id===S.energy;})[0]||ENERGIES[0],r=document.documentElement.style;
 r.setProperty('--accent',e.color);r.setProperty('--accent-soft',hexA(e.color,0.16));
}
function energyObj(){return ENERGIES.filter(function(x){return x.id===S.energy;})[0]||ENERGIES[0];}
var toastTimer=0;
function toast(t){var el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true;},3000);}
function phColor(s){var h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))%360;}return 'hsl('+h+' 28% 22%)';}
function cardImg(it){
 var src=it.photo_front||it.catalog_image;
 return src?'<img class="cimg" loading="lazy" alt="" src="'+esc(src)+'">':'<span class="cph" aria-hidden="true" style="background:'+phColor(it.name)+'">'+esc(it.name.charAt(0))+'</span>';
}
function avatar(p,sz,ring){
 var st='width:'+sz+'px;height:'+sz+'px;'+(ring?'box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--accent);':'');
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
function onav(extra){return '<header class="onav"><button class="wordmark" data-a="goto" data-v="landing" aria-label="Accueil">TROKÉMON</button>'+(extra||'')+'</header>';}
function vBoot(){return '<div class="outer center"><div class="wordmark">TROKÉMON</div><p class="muted">Chargement…</p></div>';}
function vFatal(){
 return '<div class="outer">'+onav('')+'<div class="authwrap"><h1>Un souci est survenu</h1><p class="err" role="alert">'+esc(S.err)+'</p><button class="btn" data-a="logout">Revenir à l\'accueil</button></div></div>';
}
function vNotice(){
 var n=S.notice||{};
 return '<div class="outer">'+onav('')+'<div class="authwrap"><h1>'+esc(n.title)+'</h1><p class="muted" style="margin:8px 0 20px 0">'+esc(n.text)+'</p><button class="btn primary" data-a="goto" data-v="login">Aller à la connexion</button></div></div>';
}
function vLanding(){
 return '<div class="outer">'+onav('<button class="btn sm ghost" data-a="goto" data-v="login">Se connecter</button>')+
 '<section class="hero"><div><h1>Échanger du <span class="hl">TCG</span> n\'a jamais été aussi simple</h1>'+
 '<p class="lead">Repère autour de toi les cartes que tu cherches, propose celles que tu as et échange en main propre. Gratuit, sans abonnement.</p>'+
 '<div class="ctas"><button class="btn primary" data-a="goto" data-v="signup">Créer un compte</button><button class="btn" data-a="goto" data-v="login">Se connecter</button></div>'+
 (TK.demo?'<p class="note" style="margin-top:14px">Mode démo : données fictives, rien n\'est enregistré.</p>':'<p class="note" style="margin-top:14px">Version bêta. Merci de signaler les bugs !</p>')+'</div>'+
 '<div class="demo" aria-hidden="true"><svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none" style="position:absolute;inset:0"><path d="M-10 90L410 60M-10 190L410 160M-10 270L410 250" stroke="#1E2227" stroke-width="10" fill="none"/><path d="M90 -10L120 310M220 -10L200 310M330 -10L350 310" stroke="#1E2227" stroke-width="7" fill="none"/></svg>'+
 '<span class="z" style="left:28%;top:30%;width:84px;height:84px"></span><span class="z" style="left:68%;top:24%;width:64px;height:64px"></span><span class="z" style="left:56%;top:56%;width:96px;height:96px;background:var(--accent);opacity:.35"></span><span class="z" style="left:16%;top:64%;width:56px;height:56px"></span>'+
 '<div class="democard"><div style="display:flex;justify-content:space-between;align-items:center"><span class="name">Lune_47 · ≈ 2 km</span><span class="chip acc">Mutuel</span></div><div class="muted" style="margin-top:4px">Propose Lucario (102/96) · cherche Pikachu PSA 9</div></div></div></section>'+
 '<section class="feats" aria-label="Fonctionnement">'+
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
 '<div style="display:flex;justify-content:center;margin-bottom:20px">'+avatar(S.user,136,true)+'</div>'+
 '<input type="file" accept="image/*" id="photofile" hidden>'+
 '<button class="btn" data-a="pickphoto" style="display:flex;align-items:center;justify-content:center;gap:8px">'+ico(I.camera,20)+(has?'Changer de photo':'Choisir une photo')+'</button>'+
 '<button class="btn primary" style="margin-top:10px" data-a="goto" data-v="energy">'+(has?'Continuer':'Passer pour l\'instant')+'</button></div></div>';
}
function energyTiles(){
 return '<div class="egrid">'+ENERGIES.map(function(e){
  return '<button class="etile" data-a="energy" data-v="'+e.id+'" aria-pressed="'+(S.energy===e.id)+'"><span class="dot" style="background:'+e.color+'">'+ico(e.path,20,'#0A0B0D')+'</span>'+e.name+'</button>';
 }).join('')+'</div>';
}
function vEnergy(){
 return '<div class="outer">'+onav('')+'<div class="authwrap" style="max-width:640px;text-align:center"><div class="steps">Étape 3 sur 4</div><h1>Choisis ton énergie</h1>'+
 '<p class="muted" style="margin:0 0 20px 0">Elle donne sa couleur à ton profil et à ta zone sur la carte. Tu pourras la changer plus tard.</p>'+
 '<div style="display:flex;justify-content:center;margin-bottom:24px">'+avatar(S.user,88,true)+'</div>'+energyTiles()+
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
 return '<div class="outer">'+onav('')+'<div class="authwrap"><div class="steps">Étape 4 sur 4</div><h1>Où échanges-tu ?</h1>'+
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
 return '<aside class="side" aria-label="Navigation principale"><div class="wordmark" style="padding:8px 12px 20px 12px">TROKÉMON</div>'+
 navItems().map(function(t){return '<button class="sidebtn" data-a="tab" data-v="'+t[0]+'"'+(S.tab===t[0]?' aria-current="page"':'')+'>'+ico(t[2])+'<span>'+t[1]+'</span></button>';}).join('')+
 '<div class="grow"></div><div class="me">'+avatar(S.user,40)+'<div class="grow"><div class="name">'+esc(S.user.pseudo)+'</div><div class="muted">Énergie '+energyObj().name+'</div></div></div></aside>';
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
 '<div id="preview" class="preview"></div></div>'+
 '<div class="listpane"><div class="listhead"><div class="seg" role="group" aria-label="Mode">'+modes.map(function(m){return '<button data-a="mode" data-v="'+m[0]+'" aria-pressed="'+(S.mode===m[0])+'">'+m[1]+'</button>';}).join('')+'</div><div class="name" id="pcount" style="margin-top:10px"></div></div><div id="plist"></div></div></div>';
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
 TK.map.setEntries(es.map(function(e){return {id:e.p.id,letter:esc(e.p.pseudo.charAt(0).toUpperCase()),lat:e.p.zone_lat,lng:e.p.zone_lng,mutual:e.mutual,title:e.p.pseudo};}),S.selected);
 updateList(es);updatePreview(es);
}
async function loadMapData(b){
 if(!b||S.itemFilter){return;}
 var tok=++S.mapTok;
 try{
  var d=await DB.mapData(b);
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
  onMove:function(b,c,z){S.mv={lat:c.lat,lng:c.lng,z:z};loadMapData(b);}
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
 var g={},names=[];
 list.forEach(function(i){var n=i.set_name||'Autres';if(!g[n]){g[n]=[];names.push(n);}g[n].push(i);});
 names.sort(function(a,b){return a==='Autres'?1:b==='Autres'?-1:a.localeCompare(b,'fr');});
 var one=names.length===1;
 if(!S.sets&&!S.setsLoading){S.setsLoading=true;TK.catalog.sets().then(function(x){S.sets=x;render();}).catch(function(){});}
 var meta={};(S.sets||[]).forEach(function(x){meta[x.id]=x;});
 var head=names.length>1?'<div style="display:flex;justify-content:flex-end;gap:8px;margin:4px 0"><button class="btn sm ghost" data-a="grpall" data-v="'+key+'|1">Tout déplier</button><button class="btn sm ghost" data-a="grpall" data-v="'+key+'|0">Tout replier</button></div>':'';
 return head+names.map(function(n){
  var gk=key+'|'+n,open=S.open[gk]!==undefined?S.open[gk]:one,tot=g[n].reduce(function(t,i){return t+(i.value_eur>0?Number(i.value_eur):0);},0);
  return '<details class="grp" data-gk="'+esc(gk)+'"'+(open?' open':'')+'><summary>'+setLogo(meta[g[n][0].set_id])+'<span class="grow">'+esc(n)+'</span><span class="chip">'+g[n].length+'</span>'+(tot>0?'<span class="muted" style="font-size:12px">≈ '+eur(tot)+'</span>':'')+'</summary>'+g[n].map(rowFn).join('')+'</details>';
 }).join('');
}
function itemRow(it,del){
 return '<div class="row"><button class="rowmain" data-a="item" data-v="'+esc(it.id)+'">'+cardImg(it)+
 '<span class="grow"><span class="name" style="display:block">'+label(it)+'</span><span class="muted" style="display:block">'+esc(it.set_name||'')+'</span>'+
 '<span style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">'+typeChip(it)+(it.kind==='offer'?'<span class="chip">Recto · verso</span>':'')+'</span></span>'+
 '<span class="val">'+eur(it.value_eur)+'</span></button>'+
 (del?'<button class="icon-btn" data-a="del" data-v="'+esc(it.id)+'" aria-label="Retirer '+esc(it.name)+'">'+ico(I.trash,20)+'</button>':'')+'</div>';
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
 if(!imgs.length&&it.catalog_image){imgs.push(['Catalogue',it.catalog_image.replace('/low.webp','/high.webp')]);}
 var cur=Math.min(t.img||0,imgs.length-1);
 var gal=imgs.length?'<button class="gbtn" data-a="light" data-v="'+cur+'" aria-label="Agrandir la photo"><img class="gmain" src="'+esc(imgs[cur][1])+'" alt="'+esc(it.name+' - '+imgs[cur][0])+'"></button>'+
  (imgs.length>1?'<div class="seg" style="margin-top:8px" role="group" aria-label="Face">'+imgs.map(function(x,i){return '<button data-a="gimg" data-v="'+i+'" aria-pressed="'+(i===cur)+'">'+x[0]+'</button>';}).join('')+'</div>':''):
  '<div class="gmain cph" style="background:'+phColor(it.name)+'">'+esc(it.name.charAt(0))+'</div>';
 var src=it.value_source==='cardmarket'?'Cardmarket (via TCGdex)'+(it.value_at?' · mis à jour le '+when(it.value_at):''):(it.type==='loose'?'':'Pas encore de source de prix automatique pour ce type d\'item');
 var buy='';
 if(it.type==='sealed'){
  var links=TK.buyLinks(it),aff=links.some(function(l){return l.aff;});
  buy='<div class="card"><div class="name">Acheter neuf</div><div class="muted" style="margin:2px 0 10px 0">Recherche déjà remplie pour ce produit.</div><div class="row2" style="grid-template-columns:repeat(3,1fr)">'+
   links.map(function(l){return '<a class="btn link" target="_blank" rel="noopener'+(l.aff?' sponsored':'')+'" href="'+esc(l.url)+'">'+l.label+(l.aff?' <span class="chip acc">affilié</span>':'')+'</a>';}).join('')+'</div>'+
   (aff?'<p class="note" style="margin-top:8px">Les liens marqués « affilié » nous rapportent une petite commission, sans surcoût pour toi.</p>':'')+'</div>';
 }
 var seller=mine?'':'<div class="card" style="display:flex;align-items:center;gap:12px">'+avatar(o,44)+'<div class="grow"><div class="muted">'+(it.kind==='offer'?'Proposé par':'Recherché par')+'</div><div class="name">'+esc(o.pseudo||'')+'</div><div style="font-size:13px">'+statsLine(t.stats)+'</div><div class="muted">Zone '+esc(o.zone_label||'')+(dist(o)?' · '+dist(o):'')+'</div></div><button class="btn sm" data-a="profile" data-v="'+esc(it.user_id)+'">Profil</button></div>';
 var actions=mine?'<button class="btn" data-a="del" data-v="'+esc(it.id)+'">Retirer de mes cartes</button>':(it.kind==='offer'?'<button class="btn primary" data-a="propose" data-v="'+esc(it.user_id)+'" data-item="'+esc(it.id)+'">Proposer un échange</button>':'');
 return page(header(label(it),esc(it.set_name||''),true)+'<div class="scroll"><div class="stack">'+gal+
  '<div class="card">'+
  kv('Type',it.type==='loose'?'Carte loose':it.type==='graded'?'Carte gradée':'Produit scellé')+
  kv('Numéro',it.number?esc(it.number):'')+
  kv('Série',esc(it.set_name||''))+
  (it.type==='loose'?kv('État',esc(it.condition||'')):'')+
  (it.type==='graded'?kv('Grade',esc((it.grade_company||'')+' '+(it.grade||'')))+kv('N° de certificat',esc(it.cert||'')):'')+
  kv('Estimation','<b>'+eur(it.value_eur)+'</b>'+(src?'<br><span class="muted">'+src+'</span>':''))+
  (it.notes?kv('Note',esc(it.notes)):'')+
  '<p class="note" style="margin:8px 0 0 0">Estimation indicative, pas un prix garanti.'+(it.type==='graded'?' Vérifie le certificat auprès de la société de gradation.':'')+'</p></div>'+
  buy+seller+'</div></div>'+(actions?'<div class="foot">'+actions+'</div>':''));
}
function vProfileOther(t){
 if(t.err){return page(header('Profil',null,true)+'<div class="scroll"><p class="err" style="padding:24px 0">'+esc(t.err)+'</p></div>');}
 if(!t.data){return loading('Profil');}
 var p=t.data.profile,items=t.data.items,tab=t.tab||'offers';
 var list=items.filter(function(i){return i.kind===(tab==='offers'?'offer':'want');});
 var m=matchFor(items);
 return page(header('Profil',null,true)+'<div class="scroll"><div style="text-align:center"><div style="display:flex;justify-content:center">'+avatar(p,72,true)+'</div>'+
  '<div style="font-size:20px;font-weight:800;margin-top:10px">'+esc(p.pseudo)+'</div><div class="muted">Zone '+esc(p.zone_label||'')+(dist(p)?' · '+dist(p):'')+'</div>'+
  '<div style="margin-top:6px">'+statsLine(t.data.stats)+'</div>'+
  (m.gets.length&&m.gives.length?'<div style="margin-top:8px"><span class="chip acc">Échange mutuel possible</span></div>':'')+'</div>'+
  '<div class="seg" style="margin:16px 0 4px 0" role="group"><button data-a="ptab" data-v="offers" aria-pressed="'+(tab==='offers')+'">Je propose</button><button data-a="ptab" data-v="wants" aria-pressed="'+(tab==='wants')+'">Je recherche</button><button data-a="ptab" data-v="reviews" aria-pressed="'+(tab==='reviews')+'">Avis</button></div>'+
  (tab==='reviews'?reviewList(t.data.reviews):list.length?setGroups(list,'u-'+p.id+'-'+tab,function(i){return itemRow(i,false);}):'<p class="muted" style="padding:20px 0">Rien ici pour l\'instant.</p>')+'</div>'+
  '<div class="foot"><button class="btn primary" data-a="propose" data-v="'+esc(p.id)+'">Proposer un échange</button></div>');
}

/* ---------- ajout d'une carte ---------- */
function setOptions(sel,allLabel){
 var sets=S.sets||[];
 return '<option value="">'+allLabel+'</option>'+sets.map(function(s){return '<option value="'+esc(s.id)+'"'+(s.id===sel?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
}
function vAdd(){
 var a=S.add,isOffer=a.kind==='offer',title='Ajouter à '+(isOffer?'Je propose':'Je recherche');
 if(a.picked){return vAddForm(title);}
 var pills='<div class="pills" role="group" aria-label="Type">'+[['loose','Loose'],['graded','Gradée'],['sealed','Scellé']].map(function(t){return '<button class="pill" data-a="atype" data-v="'+t[0]+'" aria-pressed="'+(a.type===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
 var body='';
 if(a.type==='sealed'){
  body='<div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
   '<div><label class="muted" for="aset">Série</label><select id="aset" class="field">'+setOptions(a.setId,'Choisis une série')+'</select></div>'+
   '<div><label class="muted" for="skind">Produit</label><select id="skind" class="field" data-f="sealedKind">'+TK.SEALED_KINDS.map(function(k){return '<option'+(k===a.f.sealedKind?' selected':'')+'>'+esc(k)+'</option>';}).join('')+'</select></div>'+
   (a.f.sealedKind==='Autre'?'<div><label class="muted" for="scustom">Nom du produit</label><input id="scustom" class="field" data-f="custom" value="'+esc(a.f.custom)+'" placeholder="Ex. Coffret Dracaufeu ex"></div>':'')+
   '<button class="btn primary" data-a="picksealed">Continuer</button></div>';
 }else{
  body='<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">'+
   '<input id="aq" class="field" type="search" placeholder="Nom de la carte (ex. Lucario)" aria-label="Nom de la carte" value="'+esc(a.q)+'" autocomplete="off">'+
   '<div><label class="muted" for="aset">Série</label><select id="aset" class="field">'+setOptions(a.setId,'Toutes les séries')+'</select></div>'+
   '<button class="btn primary" data-a="asearch">Rechercher</button></div>'+
   '<div style="margin-top:14px">'+(a.loading?'<p class="muted">Recherche…</p>':a.err?'<p class="err">'+esc(a.err)+'</p>':a.results==null?'<p class="muted">Cherche une carte par son nom, ou parcours une série.</p>':a.results.length?'<div class="cgrid">'+a.results.map(function(c,i){
     return '<button class="cat" data-a="pickcard" data-v="'+i+'">'+(c.image?'<img class="cthumb" loading="lazy" alt="" src="'+esc(c.image)+'">':'<div class="ph cph" style="background:'+phColor(c.name)+'">'+esc(c.name.charAt(0))+'</div>')+'<div class="bd"><div class="name" style="font-size:14px">'+label(c)+'</div><div class="muted" style="font-size:12px">'+esc(c.set_name||'')+'</div></div></button>';
    }).join('')+'</div>':'<p class="muted">Aucun résultat.</p>')+
   '<p style="margin-top:14px"><button class="btn sm ghost" style="color:var(--accent)" data-a="manual">Je ne trouve pas ma carte</button></p></div>';
 }
 return page(header(title,null,true)+'<div class="scroll">'+pills+body+'</div>');
}
function photoBox(side,lbl){
 var ph=S.add.photos[side];
 return '<div><button class="photobox'+(ph?' ok':'')+'" data-a="pickside" data-v="'+side+'" aria-label="'+(ph?'Changer la photo ':'Ajouter la photo ')+lbl.toLowerCase()+'">'+
  (ph?'<img src="'+esc(ph.url)+'" alt="Aperçu '+lbl.toLowerCase()+'">':ico(I.camera,28)+'<span>'+lbl+' *</span>')+'</button><input type="file" accept="image/*" id="pf-'+side+'" hidden></div>';
}
function addMissing(){
 var a=S.add,f=a.f,m=[],offer=a.kind==='offer';
 if(a.picked.manual&&!f.name.trim()){m.push('le nom de la carte');}
 if(offer){
  if(!a.photos.front){m.push('la photo recto');}
  if(!a.photos.back){m.push('la photo verso');}
  if(a.type==='graded'){if(!f.grade.trim()){m.push('la note');}if(!f.cert.trim()){m.push('le numéro de certificat');}}
 }
 return m;
}
function vAddForm(title){
 var a=S.add,f=a.f,p=a.picked,offer=a.kind==='offer',missing=addMissing();
 var img=(a.price&&a.price.image)||p.image;
 var head='<div class="card" style="display:flex;gap:12px;align-items:center">'+(img?'<img class="cimg" style="width:56px;height:78px" alt="" src="'+esc(img)+'">':'<span class="cph" style="width:56px;height:78px;background:'+phColor(p.name||'?')+'">'+esc((p.name||'?').charAt(0))+'</span>')+
  '<div class="grow"><div class="name">'+(p.manual?'Saisie manuelle':label(p))+'</div><div class="muted">'+esc(p.set_name||'')+'</div><div style="margin-top:6px"><span class="chip">'+(a.type==='loose'?'Loose':a.type==='graded'?'Gradée':'Scellé')+'</span></div></div>'+
  '<button class="btn sm" data-a="unpick">Changer</button></div>';
 var fields='';
 if(p.manual){fields+='<div><label class="muted" for="f-name">Nom *</label><input id="f-name" class="field" data-f="name" value="'+esc(f.name)+'"></div><div class="row2"><div><label class="muted" for="f-number">Numéro (ex. 102/96)</label><input id="f-number" class="field" data-f="number" value="'+esc(f.number)+'"></div><div><label class="muted" for="f-setName">Série</label><input id="f-setName" class="field" data-f="setName" value="'+esc(f.setName)+'"></div></div>';}
 if(a.type==='loose'){fields+='<div><label class="muted" for="f-condition">État</label><select id="f-condition" class="field" data-f="condition">'+CONDITIONS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===f.condition?' selected':'')+'>'+c[1]+'</option>';}).join('')+'</select></div>';}
 if(a.type==='graded'){fields+='<div class="row2"><div><label class="muted" for="f-company">Société</label><select id="f-company" class="field" data-f="company">'+COMPANIES.map(function(c){return '<option'+(c===f.company?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div><div><label class="muted" for="f-grade">Note'+(offer?' *':'')+'</label><input id="f-grade" class="field" data-f="grade" inputmode="decimal" placeholder="Ex. 9,5" value="'+esc(f.grade)+'"></div></div>'+
  '<div><label class="muted" for="f-cert">N° de certificat'+(offer?' *':'')+'</label><input id="f-cert" class="field" data-f="cert" value="'+esc(f.cert)+'" placeholder="Visible sur l\'étiquette de la slab"></div>';}
 var priceNote;
 if(a.type==='loose'){priceNote=a.price&&a.price.price?'Cote automatique Cardmarket : <b>'+eur(a.price.price)+'</b> (mise à jour le '+when(a.price.updated)+'). Elle est calculée pour toi et ne peut pas être modifiée.':'Cote automatique en cours de chargement ou indisponible pour cette carte.';}
 else if(a.type==='graded'){priceNote=(a.price&&a.price.price?'Repère : la carte non gradée vaut '+eur(a.price.price)+' sur Cardmarket. ':'')+'Pas d\'estimation automatique pour les cartes gradées en bêta : la valeur affichée sera « indisponible ».';}
 else{priceNote='Pas d\'estimation automatique pour les produits scellés en bêta : la valeur affichée sera « indisponible ».';}
 fields+='<div class="card" style="background:var(--surface2)"><div class="name" style="font-size:14px">Estimation</div><div class="note" style="margin-top:4px">'+priceNote+'</div></div>';
 if(offer){fields+='<div><div class="name" style="margin-bottom:2px">Photos *</div><div class="note" style="margin-bottom:8px">Recto et verso obligatoires. Photos non retouchées, bien éclairées, '+(a.type==='sealed'?'face avant et arrière de la boîte.':a.type==='graded'?'face avant et arrière de la slab, étiquette lisible.':'carte à plat, coins visibles.')+'</div><div class="row2">'+photoBox('front','Recto')+photoBox('back','Verso')+'</div></div>';}
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
 '<div class="card" style="display:flex;align-items:center;gap:14px">'+avatar(u,72,true)+'<div class="grow"><div class="name" style="font-size:17px">'+esc(u.pseudo)+'</div><div class="muted">'+S.my.offers.length+' à proposer · '+S.my.wants.length+' recherchées</div><div style="font-size:13px;margin-top:4px">'+statsLine(S.myStats)+'</div></div></div>'+
 '<div class="name" style="margin:20px 0 4px 0">Tes avis reçus</div>'+reviewList(S.myReviews)+
 '<input type="file" accept="image/*" id="photofile2" hidden><button class="btn" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px" data-a="pickphoto">'+ico(I.camera,20)+'Changer la photo de profil</button>'+
 '<div class="name" style="margin:20px 0 4px 0">Ta zone</div><div class="muted" style="margin-bottom:8px">'+(u.zone_label?esc(u.zone_label)+' (zone approximative, environ 2 km)':'Non définie : tu n\'apparais pas sur la carte.')+'</div>'+
 '<button class="btn" data-a="editzone">Modifier ma zone</button>'+
 '<div class="name" style="margin:20px 0 8px 0">Ton énergie</div>'+energyTiles()+
 (TK.demo?'<p class="note" style="margin-top:16px">Mode démo : profils, cartes et valeurs fictifs, rien n\'est enregistré.</p>':'')+
 '<button class="btn" style="margin-top:16px" data-a="logout">Se déconnecter</button>'+
 '<p class="note" style="margin-top:16px;text-align:center"><a href="legal.html#mentions" target="_blank" rel="noopener">Mentions légales</a> · <a href="legal.html#confidentialite" target="_blank" rel="noopener">Confidentialité</a> · <a href="legal.html#cgu" target="_blank" rel="noopener">Conditions</a></p></div>');
}

/* ---------- fenêtres ---------- */
function vSheet(){
 var s=S.sheet;if(!s){return '';}
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
 if(S.light){html+='<div class="lightbox" data-a="closelight" role="dialog" aria-label="Photo agrandie"><img alt="" src="'+esc(S.light)+'"></div>';}
 var fo=document.activeElement,fid=fo&&fo.id&&/^(aq|zq|msearch|msgin|scustom|f-)/.test(fo.id)?fo.id:null,fpos=fid&&fo.selectionStart!=null?fo.selectionStart:null;
 var key=viewKey(),prev=$('.scroll'),pos=(prev&&key===S.lastKey)?prev.scrollTop:0;
 app.innerHTML=html;S.lastKey=key;
 var sc=$('.scroll');if(sc&&pos){sc.scrollTop=pos;}
 if(fid){var n=document.getElementById(fid);if(n){n.focus();if(fpos!=null&&n.setSelectionRange){try{n.setSelectionRange(fpos,fpos);}catch(e){}}}}
 if(p==='app'){
  var tt=top();
  if(!tt&&S.tab==='carte'){mountMap();}
  if(tt&&tt.name==='proposal'){var ch=$('#chat');if(ch){ch.scrollTop=ch.scrollHeight;}S.poll=setInterval(pollTick,8000);}
 }
}

/* ---------- chargement ---------- */
async function loadMine(){
 var items=await DB.listMine();
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
   S.user=u;S.energy=u.energy||'plante';applyTheme();
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
async function setAvatar(file){
 if(!/^image\//.test(file.type)){toast('Choisis un fichier image.');return;}
 try{
  toast('Envoi de la photo…');
  var blob=await TK.shrink(file,480),url=await DB.uploadPhoto(blob,'avatar');
  if(await saveProfile({avatar_url:url})){render();}
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
}
async function openProfile(id){
 var t={name:'profile',id:id,data:null,tab:'offers'};nav(t);
 try{
  var r=await Promise.all([DB.getProfile(id),DB.listOfUser(id),DB.getStats(id).catch(function(){return null;}),DB.listReviews(id).catch(function(){return [];})]);
  if(!r[0]){throw new Error('Profil introuvable.');}
  t.data={profile:r[0],items:r[1],stats:r[2],reviews:r[3]};
 }catch(e){t.err=TK.frError(e);}
 if(top()===t){render();}
}
async function openPropose(toId,preItem){
 var t={name:'propose',id:toId,loaded:false,to:null,theirs:[],give:[],get:[],handover:'main',sending:false};nav(t);
 try{
  var r=await Promise.all([DB.getProfile(toId),DB.listOfUser(toId)]);
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
 S.add={kind:kind,type:'loose',q:'',setId:'',results:null,loading:false,err:'',picked:null,price:null,saving:false,
  f:{condition:'Near Mint',company:'PSA',grade:'',cert:'',notes:'',sealedKind:TK.SEALED_KINDS[0],custom:'',name:'',number:'',setName:''},photos:{front:null,back:null}};
 nav({name:'add'});
 TK.catalog.sets().then(function(s){S.sets=s;if(top()&&top().name==='add'){render();}}).catch(function(e){S.add.err=TK.frError(e);render();});
}
async function runSearch(){
 var a=S.add;if(!a.q.trim()&&!a.setId){a.err='Entre un nom de carte ou choisis une série.';a.results=null;render();return;}
 a.loading=true;a.err='';render();
 try{a.results=await TK.catalog.search(a.q.trim(),a.setId);}catch(e){a.err=TK.frError(e);a.results=null;}
 a.loading=false;render();
}
function pickCard(c){
 var a=S.add;a.picked=c;a.price=null;
 render();
 if(!c.manual&&c.card_id&&c.card_id.indexOf('d')!==0){
  TK.catalog.detail(c.card_id).then(function(d){
   if(!d||S.add!==a||a.picked!==c){return;}
   a.price=d;
   render();
  });
 }else if(!c.manual&&c.val){a.price={price:c.val,updated:new Date().toISOString(),image:null};render();}
}
async function submitAdd(){
 var a=S.add,f=a.f,p=a.picked,type=a.type,offer=a.kind==='offer';
 if(addMissing().length||a.saving){return;}
 a.saving=true;refreshAddBtn();$('#addbtn').textContent='Envoi…';
 try{
  var front=null,back=null;
  if(offer){
   var urls=await Promise.all([DB.uploadPhoto(a.photos.front.blob,'front'),DB.uploadPhoto(a.photos.back.blob,'back')]);
   front=urls[0];back=urls[1];
  }
  var auto=type==='loose'&&a.price&&a.price.price>0;
  var row={
   kind:a.kind,type:type,
   name:p.manual?f.name.trim():p.name,number:p.manual?(f.number.trim()||null):(p.number||null),
   set_id:p.set_id||null,set_name:p.manual?(f.setName.trim()||null):(p.set_name||null),
   card_id:(p.manual||type==='sealed')?null:p.card_id,catalog_image:p.image||null,
   condition:type==='loose'?f.condition:null,grade_company:type==='graded'?f.company:null,grade:type==='graded'?(f.grade.trim()||null):null,cert:type==='graded'?(f.cert.trim()||null):null,
   value_eur:auto?a.price.price:null,value_source:auto?'cardmarket':null,value_at:auto?a.price.updated:null,
   notes:f.notes.trim()||null,photo_front:front,photo_back:back
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
 pickphoto:function(){var i=$('input[type=file]');if(i){i.click();}},
 logout:async function(){
  try{await DB.signOut();}catch(e){}
  S.user=null;S.stack=[];S.sheet=null;S.my={offers:[],wants:[]};S.props=[];S.energy='plante';S.geo=null;S.mapProfiles=[];S.recover=false;
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
 light:function(v){var t=top(),imgs=[t.data.photo_front,t.data.photo_back].filter(Boolean);S.light=imgs[+v]||(t.data.catalog_image||'').replace('/low.webp','/high.webp');if(S.light){render();}},
 closelight:function(){S.light=null;render();},
 ltab:function(v){S.listTab=v;render();},
 add:function(v){startAdd(v);},
 atype:function(v){var a=S.add;a.type=v;a.results=null;a.err='';render();},
 asearch:function(){runSearch();},
 pickcard:function(v){pickCard(S.add.results[+v]);},
 picksealed:function(){
  var a=S.add,f=a.f;
  if(!a.setId){toast('Choisis une série.');return;}
  var name=f.sealedKind==='Autre'?f.custom.trim():f.sealedKind;
  if(!name){toast('Indique le nom du produit.');return;}
  var s=(S.sets||[]).filter(function(x){return x.id===a.setId;})[0];
  pickCard({card_id:null,name:name,number:null,set_id:a.setId,set_name:s?s.name:'',image:null});
 },
 manual:function(){pickCard({manual:true,name:'',number:null,set_id:null,set_name:'',image:null,card_id:null});},
 unpick:function(){S.add.picked=null;S.add.price=null;render();},
 pickside:function(v){var i=$('#pf-'+v);if(i){i.click();}},
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
  if(onboarding){patch.onboarded=true;}
  if(await saveProfile(patch)){
   S.mv={lat:S.user.zone_lat,lng:S.user.zone_lng,z:11};S.sheet=null;S.zonePick=null;
   if(onboarding){S.phase='app';S.tab='carte';}
   render();toast('Zone enregistrée');
  }
 },
 skipzone:async function(){if(await saveProfile({onboarded:true})){S.phase='app';S.tab='carte';render();}},
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
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.classList&&d.classList.contains('grp')){S.open[d.getAttribute('data-gk')]=d.open;}},true);
document.addEventListener('input',function(e){
 var t=e.target;
 if(t.id==='aq'){S.add.q=t.value;}
 if(t.id==='zq'){S.zoneQ=t.value;zoneSearch(t.value);}
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
 if(t.id==='aset'){S.add.setId=t.value;if(S.add.type!=='sealed'&&(S.add.q.trim()||t.value)){runSearch();}}
 if(t.id==='skind'){S.add.f.sealedKind=t.value;render();}
 else if(t.getAttribute&&t.getAttribute('data-f')&&S.add){S.add.f[t.getAttribute('data-f')]=t.value;refreshAddBtn();}
 if(t.id==='photofile'||t.id==='photofile2'){var file=t.files&&t.files[0];if(file){setAvatar(file);}}
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
  if(e.target.id==='aq'){e.preventDefault();runSearch();}
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
