/* Cache des images de cartes (TCGdex) : chargement instantané après la première visite. */
var CN='tk-img-v1';
self.addEventListener('install',function(){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',function(e){
 var r=e.request;
 if(r.method==='GET'&&r.url.indexOf('/vendor/tesseract/')>-1){
  e.respondWith(caches.open('tk-ocr-v1').then(function(c){return c.match(r.url).then(function(h){return h||fetch(r).then(function(res){if(res&&res.ok){c.put(r.url,res.clone());}return res;});});}));
  return;
 }
 if(r.method!=='GET'||r.url.indexOf('https://assets.tcgdex.net/')!==0){return;}
 e.respondWith(caches.open(CN).then(function(cache){
  return cache.match(r.url).then(function(hit){
   if(hit){return hit;}
   return fetch(new Request(r.url,{mode:'cors'})).then(function(res){
    if(res&&res.ok){cache.put(r.url,res.clone());}
    return res;
   }).catch(function(){return fetch(r);});
  });
 }));
});
