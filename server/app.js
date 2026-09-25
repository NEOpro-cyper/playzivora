const DEFAULTS={siteName:'Playzivora',tagline:'Find your next favorite game',description:'Play free GamePix, GameMonetize, and original browser games. Discover arcade, puzzle, racing, and action games with no downloads.',indexing:false,publisher:'',slot:'',cmpUrl:'',adsEnabled:false,adsApproved:false};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
function asset(path){return Uint8Array.from(atob(ASSETS[path]),c=>c.charCodeAt(0))}
function htmlAsset(path){return new TextDecoder().decode(asset(path))}
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
function owner(req,env){return env.isAdmin === true}
async function settings(db){const row=await db.prepare('SELECT data, revision FROM site_settings WHERE id = 1').first();return {settings:{...DEFAULTS,...(row?JSON.parse(row.data):{})},revision:row?.revision||0}}
function validate(v){const s={};for(const [k,max] of [['siteName',40],['tagline',100],['description',300]]){if(typeof v[k]!=='string'||!v[k].trim()||v[k].length>max)throw Error('Check '+k+' (maximum '+max+' characters).');s[k]=v[k].trim()}
for(const k of ['indexing','adsEnabled','adsApproved'])s[k]=v[k]===true;
s.publisher=v.publisher||'';s.slot=v.slot||'';s.cmpUrl=v.cmpUrl||'';
if(s.publisher&&!/^ca-pub-\d{16}$/.test(s.publisher))throw Error('Invalid AdSense publisher ID.');if(s.slot&&!/^\d{1,20}$/.test(s.slot))throw Error('Invalid ad slot ID.');
if(s.cmpUrl){const u=new URL(s.cmpUrl);if(u.protocol!=='https:'||u.hostname!=='fundingchoicesmessages.google.com'||!/^\/i\/pub-\d{16}$/.test(u.pathname)||u.username||u.password)throw Error('Use the Google Privacy & messaging CMP script URL.');}
if(s.adsEnabled&&(!s.publisher||!s.slot||!s.cmpUrl||!s.adsApproved))throw Error('Add publisher, slot, CMP script URL, and confirm domain approval before enabling ads.');return s}
async function handle(req,env){const url=new URL(req.url),path=url.pathname,origin=env.PUBLIC_ORIGIN||url.origin;
if(path==='/admin'||path.startsWith('/api/admin/')){
if(!owner(req,env))return reply({error:'Admin authentication required.'},401);
if(path==='/admin')return new Response(htmlAsset('/admin.html'),{headers:{'Content-Type':'text/html','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
if(path==='/api/admin/settings'&&req.method==='GET')return reply(await settings(env.DB));
if(path==='/api/admin/settings'&&req.method==='PUT'){
if(origin!==req.headers.get('Origin')||req.headers.get('X-Admin-Request')!=='1'||!req.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Invalid request origin.'},403);
const text=await req.text();if(text.length>12000)return reply({error:'Request too large.'},413);let body,s;try{body=JSON.parse(text);s=validate(body.settings)}catch(e){return reply({error:e.message},400)}
if(!Number.isInteger(body.revision)||body.revision<0)return reply({error:'Invalid revision.'},400);
const result=await env.DB.prepare('INSERT INTO site_settings (id,data,revision,updated_at) SELECT 1,?,1,? WHERE ? = 0 ON CONFLICT(id) DO UPDATE SET data = excluded.data, revision = site_settings.revision + 1, updated_at = excluded.updated_at WHERE site_settings.revision = ?').bind(JSON.stringify(s),new Date().toISOString(),body.revision,body.revision).run();
// Existing rows use a separate guarded UPDATE because INSERT SELECT only runs for the initial revision.
let changes=result.meta.changes;if(body.revision>0){const updated=await env.DB.prepare('UPDATE site_settings SET data = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?').bind(JSON.stringify(s),new Date().toISOString(),body.revision).run();changes=updated.meta.changes}
if(!changes)return reply({error:'Settings changed in another tab. Reload before saving.'},409);return reply(await settings(env.DB));}
return reply({error:'Not found.'},404);}
if(path==='/admin.js'||path==='/ads.js'||path==='/style.css'||path==='/app.js'||path==='/games.js'||path==='/gamepix-player.js'||path.startsWith('/assets/')){if(!ASSETS[path])return new Response('Not found',{status:404});const ext=path.split('.').pop();return new Response(asset(path),{headers:{'Content-Type':({js:'text/javascript',css:'text/css',webp:'image/webp'})[ext]||'application/octet-stream','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}})}
const {settings:s}=await settings(env.DB),games=BASE_CATALOG,cats=[...new Set(games.map(g=>g.category))];
if(path==='/favicon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#c7fb65"/><text x="32" y="46" text-anchor="middle" font-family="sans-serif" font-size="42" font-weight="bold">'+esc(s.siteName[0].toUpperCase())+'</text></svg>',{headers:{'Content-Type':'image/svg+xml'}});
if(path==='/ads.txt')return new Response(htmlAsset('/ads.txt')+(s.publisher?'\ngoogle.com, '+s.publisher.replace('ca-','')+', DIRECT, f08c47fec0942fa0\n':''),{headers:{'Content-Type':'text/plain'}});
if(path==='/robots.txt')return new Response(s.indexing?'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain'}});
if(path==='/sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...games.map(g=>'/game/'+g.id),...cats.map(c=>'/category/'+c.toLowerCase())].map(p=>'<url><loc>'+esc(origin+p)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml'}});
let game=null,category=null;if(path.startsWith('/game/'))game=games.find(g=>'/game/'+g.id===path);if(path.startsWith('/category/'))category=cats.find(c=>'/category/'+c.toLowerCase()===path);if(path!=='/'&&!game&&!category)return new Response('Page not found',{status:404});
const title=game?game.title+' — '+s.siteName:category?category+' Games — '+s.siteName:s.siteName+' — '+s.tagline,description=game?game.instructions.slice(0,300):s.description;
let html=htmlAsset('/index.html').replace('{{initial}}',()=>esc(s.siteName[0].toLowerCase())).replace(/Playzivora/g,()=>esc(s.siteName)).replace(/PLAYZIVORA/g,()=>esc(s.siteName.toUpperCase())).replace(/playzivora/g,()=>esc(s.siteName.toLowerCase())).replace(/<title>.*?<\/title>/,()=>'<title>'+esc(title)+'</title>').replace(/<meta name="description"[^>]*>/,()=>'<meta name="description" content="'+esc(description)+'">').replace(/<link rel="icon"[^>]*>/,'<link rel="icon" href="/favicon.svg">');
const canonical=origin+path,meta='<link rel="canonical" href="'+esc(canonical)+'"><meta name="robots" content="'+(s.indexing?'index,follow':'noindex,nofollow')+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta property="og:type" content="website"><meta property="og:site_name" content="'+esc(s.siteName)+'">';
const structured=game?{'@context':'https://schema.org','@type':'VideoGame',name:game.title,url:canonical,description:game.instructions,gamePlatform:'Web browser',genre:game.category}: {'@context':'https://schema.org','@type':'WebSite',name:s.siteName,url:origin,description:s.description};
html=html.replace('</head>',meta+'<script type="application/ld+json">'+json(structured)+'</script></head>');
const list=category?games.filter(g=>g.category===category):games;
const rendered=game?'<article class="seo-content"><h1>'+esc(game.title)+'</h1><p>'+esc(game.instructions)+'</p><p>Category: <a href="/category/'+game.category.toLowerCase()+'">'+esc(game.category)+'</a></p></article>':'';
html=html.replace('<div class="game-grid" id="gameGrid"></div>','<div class="game-grid" id="gameGrid">'+list.map(g=>'<article class="game-card"><div class="card-info"><h3><a href="/game/'+g.id+'">'+esc(g.title)+'</a></h3></div><p>'+esc(g.category)+'</p></article>').join('')+'</div>').replace('<main id="main">','<main id="main">'+rendered);
const publicSettings={siteName:s.siteName,tagline:s.tagline};if(!game&&s.adsEnabled)Object.assign(publicSettings,{ads:{publisher:s.publisher,slot:s.slot,cmpUrl:s.cmpUrl}});
html=html.replace('<script src="/games.js">','<script>window.__SITE__='+json(publicSettings)+';window.__CATALOG__='+json(games)+';window.__PAGE__='+json({gameId:game?.id,category})+';</script><script src="/games.js">');
if(!game&&s.adsEnabled)html=html.replace('</main>','<section class="site-ad" aria-label="Advertisement"><p>Advertisement</p><div id="siteAd"></div></section></main>').replace('</body>','<script src="/ads.js"></script></body>');
return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':s.indexing?'index, follow':'noindex, nofollow','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'}});
}
export default {async fetch(req,env){try{return await handle(req,env)}catch(e){console.error('Request failed',e.message);return req.url.includes('/api/')?reply({error:'Settings are temporarily unavailable. Your changes have not been saved. Please retry.'},503):new Response('The site is temporarily unavailable. Please try again shortly.',{status:503,headers:{'Retry-After':'30'}})}}};
