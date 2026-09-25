import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
export function openDatabase(file){
 mkdirSync(dirname(file),{recursive:true});const sql=new DatabaseSync(file);
 sql.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 sql.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
 for(const f of readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
  if(sql.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(f))continue;
  sql.exec('BEGIN IMMEDIATE');try{sql.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));sql.prepare('INSERT INTO schema_migrations(name) VALUES (?)').run(f);sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}
 }
 return {
  close:()=>sql.close(),
  prepare(q){
   return {
    args:[],
    bind(...args){this.args=args;return this},
    async first(){return sql.prepare(q).get(...this.args)||null},
    async run(){return {meta:{changes:Number(sql.prepare(q).run(...this.args).changes)}}}
   };
  }
 };
}
