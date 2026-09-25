import {randomBytes,scryptSync} from 'node:crypto';import {writeFileSync,existsSync} from 'node:fs';import {createInterface} from 'node:readline/promises';
if(existsSync('.env'))throw Error('.env already exists. Back it up and remove it to generate new credentials.');
const rl=createInterface({input:process.stdin,output:process.stdout});const host=(await rl.question('Your domain (example.com; no https://): ')).trim();rl.close();
if(!/^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(host))throw Error('Enter a valid domain name.');
const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
writeFileSync('.env',`DOMAIN=${host}\nPUBLIC_ORIGIN=https://${host}\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}\nDATABASE_PATH=data/site.sqlite\n`,{mode:0o600,flag:'wx'});
console.log('\nSaved .env. Store this password in your password manager.\nAdmin URL: https://'+host+'/admin\nUsername: admin\nPassword: '+password+'\nThe password will not be displayed again.');
