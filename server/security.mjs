import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export const randomToken=()=>randomBytes(32).toString('base64url');
export function validPassword(password){return typeof password==='string'&&password.length>=12&&password.length<=128;}
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt:${salt}:${hash.toString('hex')}`;}
// A missing account still performs the same expensive password derivation.
export async function verifyPassword(password,stored='scrypt:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000'){
 const [scheme,salt,hex]=stored.split(':');if(scheme!=='scrypt'||!salt||!hex)return false;
 const candidate=await scrypt(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});const expected=Buffer.from(hex,'hex');return expected.length===candidate.length&&timingSafeEqual(candidate,expected);
}
export function cookieToken(request){const found=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('housing_session='));return found?.slice('housing_session='.length)||'';}
export function sessionCookie(token,production,maxAge=60*60*24*14){return `housing_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production?'; Secure':''}`;}
export function sameOrigin(request,env){const origin=request.headers.get('origin');const expected=env.APP_URL?new URL(env.APP_URL).origin:new URL(request.url).origin;return origin===expected;}
