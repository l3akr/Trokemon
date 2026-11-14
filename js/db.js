/* Couche données. Deux moteurs avec la même interface :
   - Supabase (comptes, base, photos) quand config.js est rempli ;
   - démo en mémoire (données fictives, rien n'est enregistré) sinon. */
(function(){
'use strict';
var TK=window.TK=window.TK||{},C=window.TK_CONFIG||{},norm=TK.norm;
TK.demo=!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase);

TK.zoneRound=function(x){return Math.round(x*50)/50;};
/* Clé de correspondance : une carte proposée par l'un répond à la même carte recherchée par l'autre. */
TK.matchKey=function(it){
 if(it.type==='sealed'){return 's:'+(it.set_id||norm(it.set_name))+':'+norm(it.name);}
 return (it.type==='graded'?'g:':'c:')+(it.card_id||norm(it.name+'|'+(it.number||'')+'|'+(it.set_name||'')));
};
TK.frError=function(e){
 var m=(e&&e.message)||String(e||'Erreur inconnue');
 var map=[
  [/Invalid login credentials/i,'Email ou mot de passe incorrect.'],
  [/Email not confirmed/i,'Confirme d\'abord ton email avec le lien reçu par mail.'],
  [/already registered|already been registered/i,'Cet email est déjà utilisé.'],
  [/at least \d+ characters|weak password|should contain/i,'Mot de passe trop court ou trop faible.'],
  [/rate limit|too many|security purposes/i,'Trop de tentatives. Réessaie dans quelques minutes.'],
  [/Failed to fetch|NetworkError|Load failed/i,'Connexion impossible. Vérifie ta connexion internet.'],
  [/offer_has_photos/i,'Les photos recto et verso sont obligatoires pour proposer un item.'],
  [/row-level security|permission denied/i,'Action refusée par la base de données.'],
  [/duplicate key.*pseudo/i,'Ce pseudo est déjà pris.'],
  [/reviews_proposal_id_reviewer_key|duplicate key/i,'Tu as déjà donné ton avis sur cet échange.'],
  [/Bucket not found|resource was not found/i,'Stockage des photos non configuré (voir le README).']
 ];
 for(var i=0;i<map.length;i++){if(map[i][0].test(m)){return map[i][1];}}
 return m;
};

/* =================== moteur Supabase =================== */
function makeSupabase(){
 var sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 var uid=null;
 function chk(r){if(r.error){throw r.error;}return r.data;}
 var ITEM_LIGHT='id,user_id,kind,type,match_key,name,number,set_name,set_abbr,variant,catalog_image,condition,grade_company,grade,value_eur,photo_front';
 return {
  mode:'supabase',
  uid:function(){return uid;},
  init:async function(){var r=await sb.auth.getSession();uid=r.data.session?r.data.session.user.id:null;return uid;},
  onAuth:function(cb){sb.auth.onAuthStateChange(function(ev,session){uid=session?session.user.id:null;cb(ev,session);});},
  pseudoAvailable:async function(p){var r=await sb.rpc('pseudo_available',{p:p});if(r.error){throw r.error;}return !!r.data;},
  signUp:async function(email,pw,pseudo){
   if(!(await this.pseudoAvailable(pseudo))){throw new Error('Ce pseudo est déjà pris.');}
   var r=await sb.auth.signUp({email:email,password:pw,options:{data:{pseudo:pseudo},emailRedirectTo:location.href.split('#')[0].split('?')[0]}});
   if(r.error){throw r.error;}
   if(r.data.user&&r.data.user.identities&&r.data.user.identities.length===0){throw new Error('Cet email est déjà utilisé.');}
   if(r.data.session){uid=r.data.user.id;}
   return {needsConfirm:!r.data.session};
  },
  signIn:async function(email,pw){var r=await sb.auth.signInWithPassword({email:email,password:pw});if(r.error){throw r.error;}uid=r.data.user.id;},
  signOut:async function(){await sb.auth.signOut();uid=null;},
  resetPassword:async function(email){
   var r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0].split('?')[0]});
   if(r.error){throw r.error;}
  },
  updatePassword:async function(pw){var r=await sb.auth.updateUser({password:pw});if(r.error){throw r.error;}},
  cardPhotos:async function(ids){var r=await sb.rpc('card_photos',{ids:ids});if(r.error){throw r.error;}var m={};(r.data||[]).forEach(function(x){m[x.card_id]=x.photo;});return m;},

  getProfile:async function(id){return chk(await sb.from('profiles').select('*').eq('id',id).maybeSingle());},
  updateProfile:async function(patch){
   if(patch.zone_lat!=null){patch.zone_lat=TK.zoneRound(patch.zone_lat);patch.zone_lng=TK.zoneRound(patch.zone_lng);}
   return chk(await sb.from('profiles').update(patch).eq('id',uid).select().single());
  },
  uploadPhoto:async function(blob,kind){
   var path=uid+'/'+kind+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.jpg';
   var r=await sb.storage.from('photos').upload(path,blob,{contentType:'image/jpeg',upsert:false});
   if(r.error){throw r.error;}
   return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },

  listMine:async function(){return chk(await sb.from('items').select('*').eq('user_id',uid).eq('status','active').order('created_at',{ascending:false}));},
  listOfUser:async function(id){return chk(await sb.from('items').select('*').eq('user_id',id).eq('status','active').order('created_at',{ascending:false}));},
  addItem:async function(row){
   row.user_id=uid;
   var r=await sb.from('items').insert(row).select().single();
   /* base pas encore mise à jour (valeur saisie 'user' refusée) : on garde la valeur, sans l'étiquette */
   if(r.error&&/value_source/i.test(r.error.message||'')&&row.value_source==='user'){row.value_source=null;r=await sb.from('items').insert(row).select().single();}
   return chk(r);
  },
  removeItem:async function(id){chk(await sb.from('items').delete().eq('id',id));},
  updateItem:async function(id,patch){
   var r=await sb.from('items').update(patch).eq('id',id).eq('user_id',uid).select().single();
   if(r.error&&/value_source/i.test(r.error.message||'')&&patch.value_source==='user'){patch.value_source=null;r=await sb.from('items').update(patch).eq('id',id).eq('user_id',uid).select().single();}
   return chk(r);
  },
  getItem:async function(id){
   return chk(await sb.from('items').select('*, owner:profiles(id,pseudo,avatar_url,energy,zone_label,zone_lat,zone_lng)').eq('id',id).single());
  },
  /* Profils dont la zone est dans le cadre, avec leurs items (version légère). */
  mapData:async function(b){
   var ps=chk(await sb.from('profiles').select('id,pseudo,avatar_url,energy,zone_label,zone_lat,zone_lng')
    .not('zone_lat','is',null).neq('id',uid)
    .gte('zone_lat',b.south).lte('zone_lat',b.north).gte('zone_lng',b.west).lte('zone_lng',b.east).limit(300));
   var ids=ps.map(function(p){return p.id;}),chunks=[];
   for(var i=0;i<ids.length;i+=60){chunks.push(ids.slice(i,i+60));}
   var res=await Promise.all(chunks.map(function(ch){return sb.from('items').select(ITEM_LIGHT).in('user_id',ch).eq('status','active').limit(1000);}));
   var items=[];res.forEach(function(r){items=items.concat(chk(r));});
   return {profiles:ps,items:items};
  },

  createProposal:async function(p){p.from_user=uid;return chk(await sb.from('proposals').insert(p).select().single());},
  listProposals:async function(){
   return chk(await sb.from('proposals').select('*, from_p:profiles!proposals_from_fkey(id,pseudo,avatar_url), to_p:profiles!proposals_to_fkey(id,pseudo,avatar_url)').order('created_at',{ascending:false}));
  },
  setProposalStatus:async function(id,status){return chk(await sb.from('proposals').update({status:status}).eq('id',id).select().single());},
  proposeMeeting:async function(id,place,at){return chk(await sb.rpc('propose_meeting',{pid:id,place:place,at:at}));},
  answerMeeting:async function(id,accept){return chk(await sb.rpc('answer_meeting',{pid:id,accept:accept}));},
  confirmExchange:async function(id){return chk(await sb.rpc('confirm_exchange',{pid:id}));},
  listMessages:async function(pid){return chk(await sb.from('messages').select('*').eq('proposal_id',pid).order('created_at',{ascending:true}));},
  sendMessage:async function(pid,body){return chk(await sb.from('messages').insert({proposal_id:pid,sender:uid,body:body}).select().single());},
  showcase:async function(){return chk(await sb.rpc('showcase',{n:8}));},
  searchItems:async function(q){
   var its=chk(await sb.rpc('search_items',{q:q,lim:200}));
   var ids=[],seen={};its.forEach(function(i){if(!seen[i.user_id]){seen[i.user_id]=1;ids.push(i.user_id);}});
   var chunks=[];for(var k=0;k<ids.length;k+=60){chunks.push(ids.slice(k,k+60));}
   var res=await Promise.all(chunks.map(function(ch){return sb.from('profiles').select('id,pseudo,avatar_url,energy,zone_label,zone_lat,zone_lng').in('id',ch).not('zone_lat','is',null);}));
   var ps=[];res.forEach(function(r){ps=ps.concat(chk(r));});
   var ok={};ps.forEach(function(p){ok[p.id]=1;});
   return {profiles:ps,items:its.filter(function(i){return ok[i.user_id];})};
  },
  /* Avis et statistiques publiques */
  getStats:async function(id){
   var r=chk(await sb.rpc('profile_stats',{p:id}));var x=Array.isArray(r)?r[0]:r;
   return {done:(x&&x.done_count)||0,avg:x&&x.rating_avg!=null?Number(x.rating_avg):null,count:(x&&x.rating_count)||0};
  },
  listReviews:async function(id){
   return chk(await sb.from('reviews').select('id,rating,comment,created_at,proposal_id,reviewer,who:profiles!reviews_reviewer_fkey(id,pseudo,avatar_url,energy)').eq('reviewed',id).order('created_at',{ascending:false}).limit(50));
  },
  myReviewFor:async function(pid){
   var r=chk(await sb.from('reviews').select('id,rating,comment').eq('proposal_id',pid).eq('reviewer',uid).maybeSingle());return r;
  },
  addReview:async function(pid,reviewed,rating,comment){
   return chk(await sb.from('reviews').insert({proposal_id:pid,reviewer:uid,reviewed:reviewed,rating:rating,comment:comment||null}).select().single());
  }
 };
}

/* =================== moteur démo =================== */
function demoFinish(p){
 if(!(p.confirm_from&&p.confirm_to)||p.status==='done'){return;}
 var DBx=window.TK._demoDB;if(!DBx){return;}
 p.status='done';
 var mine={},keys=[];
 (p.give||[]).forEach(function(g){mine[g.id]=1;});(p.get||[]).forEach(function(g){mine[g.id]=1;});
 DBx.items.forEach(function(i){if(mine[i.id]){i.status='traded';}});
 (p.get||[]).forEach(function(g){var it=DBx.items.filter(function(i){return i.id===g.id;})[0];if(it&&it.match_key){keys.push(it.match_key);}});
 keys.forEach(function(k){var w=DBx.items.filter(function(i){return i.user_id==='me'&&i.kind==='want'&&i.status!=='traded'&&i.match_key===k;})[0];if(w){w.status='traded';}});
}
function makeDemo(){
 var DB={profiles:[],items:[],proposals:[],messages:[],reviews:[],stats:{}},me=null,seq=0;window.TK._demoDB=DB;
 function nid(p){seq++;return p+seq;}
 function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function itemFrom(card,kind,uid,i){
  var it={id:nid('i'),user_id:uid,kind:kind,type:card.type,name:card.name,number:card.number,set_id:card.set_id,set_name:card.set_name,set_abbr:({'demo-nn':'PBL','demo-151':'MEW','demo-pe':'PRE','demo-base':'BS'})[card.set_id]||null,card_id:card.type==='sealed'?null:card.card_id,
   catalog_image:null,condition:card.type==='loose'?'Near Mint':null,grade_company:card.company||null,grade:card.grade||null,cert:card.type==='graded'&&kind==='offer'?'8'+(1000000+i*7919):null,
   value_eur:card.type==='loose'?card.val:null,value_source:card.type==='loose'?'cardmarket':null,value_at:card.type==='loose'?new Date(Date.now()-3600e3*3).toISOString():null,photo_front:null,photo_back:null,notes:null,status:'active',created_at:new Date().toISOString()};
  it.match_key=TK.matchKey(it);return it;
 }
 /* profils fictifs autour des grandes villes */
 (function seed(){
  var r=rng(42),n=0,first=['Lune','Mistral','Kiwi','Cobalt','Zélie','Pixel','Sunny','Basile','Iris','Taro','Maya','Elio'];
  var counts={Toulouse:9,Paris:8,Lyon:6,Marseille:6,Bordeaux:6,Nantes:4,Lille:4,Montpellier:5,Strasbourg:4,Nice:4,Rennes:3};
  var hand={Toulouse:[{o:[5,9],w:[3]},{o:[8],w:[1,12]},{o:[9,11],w:[4]}],Paris:[{o:[10,8],w:[3,2]}],Lyon:[{o:[5],w:[4,1]}],Bordeaux:[{o:[8],w:[1]}]};
  function pickN(k){var a=[];while(a.length<k){var id=1+Math.floor(r()*12);if(a.indexOf(id)<0){a.push(id);}}return a;}
  TK.PLACES.forEach(function(pl){
   if(pl.k!=='Ville'||!counts[pl.n]){return;}
   for(var i=0;i<counts[pl.n];i++){
    var h=hand[pl.n]&&hand[pl.n][i],id='demo-p'+n;
    DB.profiles.push({id:id,pseudo:first[n%first.length]+'_'+(10+Math.floor(r()*90)),avatar_url:null,energy:['plante','feu','eau','psy','electrique'][n%5],zone_label:pl.n,
     zone_lat:TK.zoneRound(pl.lat+(r()-.5)*0.2),zone_lng:TK.zoneRound(pl.lng+(r()-.5)*0.25),onboarded:true});
    (h?h.o:pickN(1+Math.floor(r()*3))).forEach(function(c,j){DB.items.push(itemFrom(TK.DEMO_CARDS[c-1],'offer',id,j));});
    (h?h.w:pickN(1+Math.floor(r()*3))).forEach(function(c,j){DB.items.push(itemFrom(TK.DEMO_CARDS[c-1],'want',id,j));});
    var rr=r(),k=Math.floor(r()*4);
    DB.stats[id]={done:k===0?0:2+Math.floor(r()*30),sum:0,n:0};
    if(DB.stats[id].done>0){
     var cm=['Échange nickel, carte conforme aux photos.','Rapide et sympa, rendez-vous ponctuel.','Très bon contact, je recommande.','Carte en bon état, merci !','Ponctuel, échange équitable.'];
     for(var q=0;q<Math.min(3,DB.stats[id].done);q++){
      var rt=rr>0.15?(r()>0.3?5:4):(r()>0.5?3:4);
      DB.reviews.push({id:'dr'+n+'-'+q,proposal_id:'dp'+n+'-'+q,reviewer:'demo-p'+((n+q+1)%12),reviewed:id,rating:rt,comment:cm[(n+q)%cm.length],created_at:new Date(Date.now()-86400e3*(5+q*17+n)).toISOString()});
     }
     var mine=DB.reviews.filter(function(x){return x.reviewed===id;});
     DB.stats[id].sum=mine.reduce(function(t,x){return t+x.rating;},0);DB.stats[id].n=mine.length;
    }
    n++;
   }
  });
  /* reviewers fictifs : on s'assure qu'ils existent */
  DB.reviews=DB.reviews.filter(function(x){return DB.profiles.some(function(p){return p.id===x.reviewer;});});
 })();
 function createMe(email,pseudo,onboarded){
  me={id:'me',pseudo:pseudo,avatar_url:null,energy:null,zone_label:onboarded?'Toulouse':null,zone_lat:onboarded?43.6:null,zone_lng:onboarded?1.44:null,onboarded:!!onboarded,email:email};
  DB.profiles=DB.profiles.filter(function(p){return p.id!=='me';});DB.profiles.push(me);
  DB.items=DB.items.filter(function(i){return i.user_id!=='me';});
  [5,9,8].forEach(function(c,j){DB.items.push(itemFrom(TK.DEMO_CARDS[c-1],'want','me',j));});
  [3,1,4].forEach(function(c,j){DB.items.push(itemFrom(TK.DEMO_CARDS[c-1],'offer','me',j));});
 }
 function prof(id){return DB.profiles.filter(function(p){return p.id===id;})[0]||null;}
 function brief(p){return p?{id:p.id,pseudo:p.pseudo,avatar_url:p.avatar_url}:null;}
 function copy(x){return JSON.parse(JSON.stringify(x));}
 return {
  mode:'demo',
  uid:function(){return me?me.id:null;},
  init:async function(){return null;},
  onAuth:function(){},
  pseudoAvailable:async function(p){return !DB.profiles.some(function(x){return norm(x.pseudo)===norm(p);});},
  signUp:async function(email,pw,pseudo){
   if(!(await this.pseudoAvailable(pseudo))){throw new Error('Ce pseudo est déjà pris.');}
   createMe(email,pseudo,false);return {needsConfirm:false};
  },
  signIn:async function(email){createMe(email,email.split('@')[0].slice(0,20)||'dresseur',true);},
  signOut:async function(){me=null;},
  resetPassword:async function(){},
  updatePassword:async function(){},
  cardPhotos:async function(ids){var m={};DB.items.forEach(function(i){if(i.card_id&&i.photo_front&&ids.indexOf(i.card_id)>-1&&!m[i.card_id]){m[i.card_id]=i.photo_front;}});return m;},
  getProfile:async function(id){return copy(prof(id));},
  updateProfile:async function(patch){
   if(patch.zone_lat!=null){patch.zone_lat=TK.zoneRound(patch.zone_lat);patch.zone_lng=TK.zoneRound(patch.zone_lng);}
   Object.keys(patch).forEach(function(k){me[k]=patch[k];});return copy(me);
  },
  uploadPhoto:async function(blob){return URL.createObjectURL(blob);},
  listMine:async function(){return copy(DB.items.filter(function(i){return i.user_id==='me'&&i.status!=='traded';}).reverse());},
  listOfUser:async function(id){return copy(DB.items.filter(function(i){return i.user_id===id&&i.status==='active';}).reverse());},
  addItem:async function(row){
   if(row.kind==='offer'&&!row.photo_optional&&!(row.photo_front&&row.photo_back)){throw new Error('offer_has_photos');}
   row.id=nid('i');row.user_id='me';row.status='active';row.created_at=new Date().toISOString();DB.items.push(row);return copy(row);
  },
  removeItem:async function(id){DB.items=DB.items.filter(function(i){return i.id!==id;});},
  updateItem:async function(id,patch){var it=DB.items.filter(function(i){return i.id===id&&i.user_id==='me';})[0];if(!it){throw new Error('Item introuvable.');}Object.assign(it,patch);return copy(it);},
  getItem:async function(id){
   var it=DB.items.filter(function(i){return i.id===id;})[0];if(!it){throw new Error('Item introuvable.');}
   var o=copy(it);o.owner=copy(prof(it.user_id));return o;
  },
  mapData:async function(b){
   var ps=DB.profiles.filter(function(p){return p.id!=='me'&&p.zone_lat!=null&&p.zone_lat>=b.south&&p.zone_lat<=b.north&&p.zone_lng>=b.west&&p.zone_lng<=b.east;});
   var ids={};ps.forEach(function(p){ids[p.id]=1;});
   return copy({profiles:ps,items:DB.items.filter(function(i){return ids[i.user_id]&&i.status==='active';})});
  },
  createProposal:async function(p){
   p.id=nid('pr');p.from_user='me';p.status='sent';p.created_at=new Date().toISOString();p.updated_at=p.created_at;DB.proposals.push(p);return copy(p);
  },
  listProposals:async function(){
   return copy(DB.proposals.slice().reverse().map(function(p){var o=copy(p);o.from_p=brief(prof(p.from_user));o.to_p=brief(prof(p.to_user));return o;}));
  },
  setProposalStatus:async function(id,status){
   var p=DB.proposals.filter(function(x){return x.id===id;})[0];p.status=status;p.updated_at=new Date().toISOString();return copy(p);
  },
  proposeMeeting:async function(id,place,at){
   var p=DB.proposals.filter(function(x){return x.id===id;})[0];
   if(!String(place||'').trim()){throw new Error('Indique un lieu');}
   p.meeting={place:String(place).trim().slice(0,200),at:at,by:'me',status:'proposed'};return copy(p);
  },
  answerMeeting:async function(id,accept){
   var p=DB.proposals.filter(function(x){return x.id===id;})[0];if(p.meeting){p.meeting.status=accept?'accepted':'declined';}return copy(p);
  },
  confirmExchange:async function(id){
   var p=DB.proposals.filter(function(x){return x.id===id;})[0];p.confirm_from=true;demoFinish(p);return copy(p);
  },
  /* Démo uniquement : simule la réponse de l'autre personne. */
  demoReply:async function(id,status){
   var p=DB.proposals.filter(function(x){return x.id===id;})[0];
   if(status==='meeting'){if(p.meeting&&p.meeting.by==='me'){p.meeting.status='accepted';}else if(!p.meeting||p.meeting.status!=='proposed'){p.meeting={place:'Café des Carmes, Toulouse',at:new Date(Date.now()+3*864e5).toISOString(),by:p.to_user,status:'proposed'};}return;}
   if(status==='confirm'){p.confirm_to=true;demoFinish(p);return;}
   p.status=status;
   if(status==='accepted'){DB.messages.push({id:nid('m'),proposal_id:id,sender:p.to_user,body:'Ça me va ! Samedi en boutique, en début d\'après-midi ?',created_at:new Date().toISOString()});}
  },
  listMessages:async function(pid){return copy(DB.messages.filter(function(m){return m.proposal_id===pid;}));},
  sendMessage:async function(pid,body){
   var m={id:nid('m'),proposal_id:pid,sender:'me',body:body,created_at:new Date().toISOString()};DB.messages.push(m);return copy(m);
  },
  showcase:async function(){
   return copy(DB.items.filter(function(i){return i.kind==='offer'&&i.status==='active'&&i.user_id!=='me';}).slice(0,8).map(function(i){var p=prof(i.user_id)||{};
    return {name:i.name,number:i.number,set_name:i.set_name,set_abbr:i.set_abbr||null,variant:i.variant||null,image:i.catalog_image||i.photo_front||null,zone_label:p.zone_label||''};}));
  },
  searchItems:async function(q){
   var toks=String(q).replace(/[#()\-]/g,' ').split(/\s+/).filter(Boolean).map(TK.norm);
   var its=DB.items.filter(function(i){
    if(i.status!=='active'||i.user_id==='me'){return false;}
    var hay=TK.norm([i.name,i.set_abbr,i.set_name,i.number,i.variant].join(' '));
    return toks.every(function(t){return hay.indexOf(t)>-1;});
   }).slice(0,200);
   var ok={};its.forEach(function(i){ok[i.user_id]=1;});
   return copy({profiles:DB.profiles.filter(function(p){return ok[p.id]&&p.zone_lat!=null;}),items:its});
  },
  getStats:async function(id){
   var r=DB.reviews.filter(function(x){return x.reviewed===id;}),sum=r.reduce(function(t,x){return t+x.rating;},0);
   var base=DB.stats[id]||{done:0};
   var done=base.done+DB.proposals.filter(function(p){return p.status==='done'&&(p.from_user===id||p.to_user===id);}).length;
   var cnt=r.length,tot=sum+(base.sum||0),n=cnt+(base.n||0);
   return {done:done,avg:n?Math.round(tot/n*100)/100:null,count:n};
  },
  listReviews:async function(id){
   return copy(DB.reviews.filter(function(x){return x.reviewed===id;}).sort(function(a,b){return a.created_at<b.created_at?1:-1;}).map(function(x){
    var w=prof(x.reviewer);return Object.assign({},x,{who:{id:w.id,pseudo:w.pseudo,avatar_url:w.avatar_url,energy:w.energy}});
   }));
  },
  myReviewFor:async function(pid){return copy(DB.reviews.filter(function(x){return x.proposal_id===pid&&x.reviewer==='me';})[0]||null);},
  addReview:async function(pid,reviewed,rating,comment){
   var r={id:nid('r'),proposal_id:pid,reviewer:'me',reviewed:reviewed,rating:rating,comment:comment||null,created_at:new Date().toISOString()};DB.reviews.push(r);return copy(r);
  }
 };
}

TK.db=TK.demo?makeDemo():makeSupabase();
})();
