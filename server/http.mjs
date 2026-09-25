import {createServer} from 'node:http';
import {scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import app from '../dist/server/index.js';
const derive=promisify(scrypt);
export function makeServer({DB,origin,username,passwordHash,trustProxy=false}){
 const u=new URL(origin);if(u.origin!==origin||(!['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol!=='https:'))throw Error('PUBLIC_ORIGIN must be an HTTPS origin without a trailing slash.');
 const match=/^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(passwordHash||'');if(!match||!username)throw Error('Run npm run setup before starting.');
 const expected=Buffer.from(match[2],'hex'),failures=new Map();let active=0;
 const server=createServer(async(req,res)=>{
  const send=(status,message,extra={})=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(message)};
  try{
   const url=new URL(req.url,origin);if(url.origin!==origin)return send(400,'Invalid request.');
   if(url.pathname==='/healthz')return send(200,'ok');
   const isAdminPath=url.pathname==='/admin'||url.pathname.startsWith('/api/admin/');let isAdmin=false;
   if(isAdminPath){
    const now=Date.now();for(const [key,v] of failures)if(v.until<now)failures.delete(key);
    const ip=trustProxy?String(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;
    if((failures.get(ip)?.count||0)>=10||active>=4)return send(429,'Too many attempts. Try again in 15 minutes.',{'Retry-After':'900'});
    const header=req.headers.authorization||'';let user='',password='';if(header.startsWith('Basic ')&&header.length<4096){const decoded=Buffer.from(header.slice(6),'base64').toString('utf8'),i=decoded.indexOf(':');if(i>=0){user=decoded.slice(0,i);password=decoded.slice(i+1)}}
    if(header){active++;try{const candidate=await derive(password,match[1],64);isAdmin=timingSafeEqual(candidate,expected)&&user===username}finally{active--}}
    if(!isAdmin){if(header){if(failures.size>=10000)failures.clear();const v=failures.get(ip)||{count:0,until:now+900000};v.count++;failures.set(ip,v)}return send(401,'Administrator sign-in required.',{'WWW-Authenticate':'Basic realm="Site admin", charset="UTF-8"'})}failures.delete(ip);
   }
   if(!['GET','HEAD','PUT'].includes(req.method))return send(405,'Method not allowed.',{Allow:'GET, HEAD, PUT'});
   let length=0;const chunks=[];for await(const part of req){length+=part.length;if(length>16384)return send(413,'Request too large.');chunks.push(part)}
   // Construct headers from a narrow allowlist. Client-supplied identity headers are never trusted.
   const headers=new Headers();for(const key of ['content-type','origin','x-admin-request'])if(req.headers[key])headers.set(key,req.headers[key]);
   const body=chunks.length?Buffer.concat(chunks):undefined;
   const response=await app.fetch(new Request(url,{method:req.method,headers,...(body&&!['GET','HEAD'].includes(req.method)?{body}: {})}),{DB,PUBLIC_ORIGIN:origin,isAdmin});
   res.writeHead(response.status,{...Object.fromEntries(response.headers),'X-Frame-Options':'SAMEORIGIN'});res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
  }catch(e){console.error('Request error:',e.message);if(!res.headersSent)send(500,'The site is temporarily unavailable.');else res.end()}
 });server.requestTimeout=30000;server.headersTimeout=15000;return server;
}
