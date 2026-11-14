/* Carte (Leaflet). Zones approximatives : à grande échelle des bulles par secteur, puis une zone par profil. */
(function(){
'use strict';
var TK=window.TK=window.TK||{},C=window.TK_CONFIG||{},L=window.L;
var st={radiusLayer:null,map:null,layer:null,ro:null,entries:[],sel:null,me:null,meLayer:null,cb:{}};
var CLUSTER_MAX_Z=9,ZONE_RADIUS_M=1500;

function accent(){return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#F5C842';}
function hexA(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
function reduced(){return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}

TK.map={
 /* opt : center [lat,lng], zoom, onSelect(id|null), onMove(bounds, center, zoom) */
 mount:function(el,opt){
  TK.map.destroy();
  if(!L){el.innerHTML='<p class="muted" style="padding:16px">La carte n\'a pas pu se charger.</p>';return;}
  st.cb=opt;
  var map=st.map=L.map(el,{zoomControl:false,minZoom:4,maxZoom:18,zoomSnap:0.5,worldCopyJump:false}).setView(opt.center,opt.zoom);
  L.control.zoom({position:'bottomright',zoomInTitle:'Zoom avant',zoomOutTitle:'Zoom arrière'}).addTo(map);
  var key=C.CARTO_KEY?'?key='+encodeURIComponent(C.CARTO_KEY):'';
  function base(style){return L.tileLayer(C.TILE_URL.replace('{style}',style)+key,{maxZoom:20,maxNativeZoom:20,attribution:C.TILE_ATTRIBUTION,crossOrigin:true});}
  var dark=base('dark_all'),detail=base('voyager'),pref='dark';
  try{pref=localStorage.getItem('tk_basemap')||'dark';}catch(e){}
  (pref==='detail'?detail:dark).addTo(map);
  L.control.layers({'Sombre':dark,'Détaillée (couleurs)':detail},null,{position:'topright',collapsed:true}).addTo(map);
  map.on('baselayerchange',function(ev){try{localStorage.setItem('tk_basemap',ev.layer===detail?'detail':'dark');}catch(e){}});
  st.layer=L.layerGroup().addTo(map);
  var t=0;
  function moved(){
   TK.map.redraw();
   clearTimeout(t);
   t=setTimeout(function(){if(st.map===map&&st.cb.onMove){st.cb.onMove(TK.map.bounds(),map.getCenter(),map.getZoom());}},350);
  }
  map.on('moveend zoomend',moved);
  map.on('zoomend',function(){if(st.cb.onZoom){st.cb.onZoom(map.getZoom());}});
  map.on('move zoom resize',function(){TK.map.drawRadius();});
  map.on('click',function(){if(st.cb.onSelect){st.cb.onSelect(null);}});
  if(window.ResizeObserver){st.ro=new ResizeObserver(function(){if(st.map){st.map.invalidateSize();}});st.ro.observe(el);}
  TK.map.setMe(st.me);
  setTimeout(function(){if(st.map===map){map.invalidateSize();moved();}},0);
 },
 destroy:function(){
  if(st.ro){st.ro.disconnect();st.ro=null;}
  if(st.map){st.map.remove();st.map=null;st.layer=null;st.meLayer=null;}
 },
 /* entries : [{id, letter, lat, lng, mutual}] */
 setEntries:function(entries,sel){st.entries=entries;st.sel=sel;TK.map.redraw();},
 setMe:function(me){
  st.me=me;
  if(!st.map){return;}
  if(st.meLayer){st.meLayer.remove();st.meLayer=null;}
  if(!me){return;}
  var g=L.layerGroup();
  L.circle([me.lat,me.lng],{radius:ZONE_RADIUS_M,color:'#F1F3F4',weight:1.5,dashArray:'5 4',fillColor:'#F1F3F4',fillOpacity:.06,interactive:false}).addTo(g);
  L.marker([me.lat,me.lng],{icon:L.divIcon({className:'tk-ic',html:'<div class="me-dot"></div>',iconSize:[14,14]}),interactive:false,keyboard:false}).addTo(g);
  g.addTo(st.map);st.meLayer=g;
 },
 getZoom:function(){return st.map?st.map.getZoom():null;},
 setZoom:function(z){if(st.map){st.map.setZoom(z,{animate:!reduced()});}},
 /* Zone de recherche = disque centré sur la carte, dont la taille suit le zoom (plus on zoome, plus la zone est petite). */
 radiusKm:function(z){
  var m=st.map;if(!m){return 0;}
  var s=m.getSize(),c=m.getCenter(),zz=z==null?m.getZoom():z;
  var mpp=156543.03392*Math.cos(c.lat*Math.PI/180)/Math.pow(2,zz);
  return Math.max(1,Math.round(Math.min(s.x,s.y)*0.4*mpp/1000));
 },
 drawRadius:function(){
  if(!st.map){return;}
  if(st.radiusLayer){st.radiusLayer.remove();st.radiusLayer=null;}
  var km=TK.map.radiusKm();if(!km){return;}
  st.radiusLayer=L.circle(st.map.getCenter(),{radius:km*1000,color:accent(),weight:2,dashArray:'6 6',fillColor:accent(),fillOpacity:.05,interactive:false}).addTo(st.map);
 },
 flyTo:function(lat,lng,z){
  if(!st.map){return;}
  if(reduced()){st.map.setView([lat,lng],z);}else{st.map.flyTo([lat,lng],z,{duration:.8});}
 },
 fit:function(pts){
  if(!st.map||!pts.length){return;}
  if(pts.length===1){TK.map.flyTo(pts[0][0],pts[0][1],12);return;}
  var b=L.latLngBounds(pts).pad(0.25);
  if(reduced()){st.map.fitBounds(b,{maxZoom:12});}else{st.map.flyToBounds(b,{maxZoom:12,duration:.8});}
 },
 bounds:function(){
  if(!st.map){return null;}
  var b=st.map.getBounds().pad(0.2);
  return {south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()};
 },
 contains:function(lat,lng){return st.map?st.map.getBounds().contains([lat,lng]):true;},
 center:function(){return st.map?st.map.getCenter():null;},
 redraw:function(){
  if(!st.map||!st.layer){return;}
  var map=st.map,z=map.getZoom(),acc=accent();
  st.layer.clearLayers();
  var pick=function(id){if(st.cb.onSelect){st.cb.onSelect(id);}};
  if(z<=CLUSTER_MAX_Z){
   var cells={};
   st.entries.forEach(function(e){
    var p=map.project([e.lat,e.lng],z),k=Math.floor(p.x/70)+':'+Math.floor(p.y/70);
    var c=cells[k]||(cells[k]={n:0,lat:0,lng:0,ids:[],pts:[]});
    c.n++;c.lat+=e.lat;c.lng+=e.lng;c.ids.push(e.id);c.pts.push([e.lat,e.lng]);
   });
   Object.keys(cells).forEach(function(k){
    var c=cells[k],size=Math.min(56,36+Math.sqrt(c.n)*4);
    var m=L.marker([c.lat/c.n,c.lng/c.n],{icon:L.divIcon({className:'tk-ic',html:'<div class="bub" style="width:'+size+'px;height:'+size+'px">'+c.n+'</div>',iconSize:[size,size]}),keyboard:false});
    m.on('click',function(ev){
     L.DomEvent.stopPropagation(ev);
     if(c.n>1){map.flyToBounds(L.latLngBounds(c.pts).pad(0.3),{maxZoom:12,duration:.7});}else{map.flyTo(c.pts[0],12,{duration:.7});}
    });
    m.addTo(st.layer);
   });
   return;
  }
  st.entries.slice().sort(function(a,b){return (a.id===st.sel?1:0)-(b.id===st.sel?1:0);}).forEach(function(e){
   var sel=e.id===st.sel;
   L.circle([e.lat,e.lng],{radius:ZONE_RADIUS_M,color:acc,weight:sel?3:2,fillColor:acc,fillOpacity:sel?.35:e.mutual?.26:.12,interactive:false}).addTo(st.layer);
   var m=L.marker([e.lat,e.lng],{icon:L.divIcon({className:'tk-ic',html:'<div class="pin'+(sel?' sel':'')+(e.mutual?' mut':'')+'">'+(e.inner||e.letter)+'</div>',iconSize:[34,34]}),keyboard:false,title:e.title||''});
   m.on('click',function(ev){L.DomEvent.stopPropagation(ev);pick(e.id);});
   m.addTo(st.layer);
  });
 }
};
})();
