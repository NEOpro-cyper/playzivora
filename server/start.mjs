import {openDatabase} from './database.mjs';import {makeServer} from './http.mjs';
const DB=openDatabase(process.env.DATABASE_PATH||'data/site.sqlite');
const server=makeServer({DB,origin:process.env.PUBLIC_ORIGIN,username:process.env.ADMIN_USERNAME,passwordHash:process.env.ADMIN_PASSWORD_HASH,trustProxy:process.env.TRUST_PROXY==='true'});
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Portal listening on port '+(process.env.PORT||3000)));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{DB.close();process.exit(0)}));
