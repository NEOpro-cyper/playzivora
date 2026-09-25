import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};vm.createContext(ctx);
for(const f of ['gamepix-catalog.js','gamemonetize-catalog.js'])vm.runInContext(fs.readFileSync('web/'+f,'utf8'),ctx);
const app=fs.readFileSync('web/app.js','utf8');vm.runInContext(app.slice(app.indexOf('const originalGames='),app.indexOf('const defaults='))+';window.originalGames=originalGames;',ctx);
const catalog=[...ctx.window.GAMEMONETIZE_CATALOG,...ctx.window.GAMEPIX_CATALOG,...ctx.window.originalGames];
const assets={};function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else assets['/'+p.slice(4)]=fs.readFileSync(p).toString('base64')}}walk('web');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\nconst BASE_CATALOG='+JSON.stringify(catalog)+';\n'+fs.readFileSync('server/app.js','utf8'));

console.log('Built portable app with '+catalog.length+' games.');
