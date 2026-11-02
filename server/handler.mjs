import {randomUUID} from 'node:crypto';
import {getPool} from './db.mjs';
import {hashPassword,verifyPassword,validPassword,randomToken,tokenHash,cookieToken,sessionCookie,sameOrigin} from './security.mjs';
import {scenarioDocument} from './model.mjs';
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const publicUser=u=>({id:u.id,username:u.username,email:u.email});
const emailValue=s=>typeof s==='string'?s.trim().toLowerCase():'';
const emailValid=s=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
async function bodyOf(request){if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new HttpError(415,'Send JSON data.');const text=await request.text();if(text.length>50000)throw new HttpError(413,'Request too large.');try{return JSON.parse(text)}catch{throw new HttpError(400,'Invalid JSON.')}}
export function createHandler({poolFactory=getPool,env=process.env,sendEmail=defaultEmail}={}){
 async function limit(db,key,max,minutes=15){const expiry=new Date(Date.now()+minutes*60000);const r=await db.query(`INSERT INTO housing_limits(key,attempts,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN housing_limits.expires_at<now() THEN 1 ELSE housing_limits.attempts+1 END, expires_at=CASE WHEN housing_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE housing_limits.expires_at END RETURNING attempts`,[tokenHash(key),expiry]);if(r.rows[0].attempts>max)throw new HttpError(429,'Too many attempts. Please try again in 15 minutes.');}
 async function userFor(db,request){const token=cookieToken(request);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return(await db.query('SELECT u.id,u.username,u.email FROM housing_sessions s JOIN housing_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[tokenHash(token)])).rows[0]||null;}
 async function newSession(db,user){const token=randomToken();await db.query('INSERT INTO housing_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[tokenHash(token),user.id,new Date(Date.now()+14*86400000)]);return sessionCookie(token,env.NODE_ENV==='production');}
 return async function handle(request){
  try{
   const path=new URL(request.url).pathname.replace(/\/$/,'');const method=request.method;
   if(method!=='GET'&&!sameOrigin(request,env))throw new HttpError(403,'Request origin not allowed.');
   if(path==='/api/health'&&method==='GET'){let database=false;try{await poolFactory().query('SELECT 1 FROM housing_users LIMIT 1');database=true}catch{}return json({database,passwordReset:!!(env.RESEND_API_KEY&&env.RESET_FROM_EMAIL&&env.APP_URL)},database?200:503);}
   const db=poolFactory();
   if(path==='/api/auth/session'&&method==='GET')return json({user:await userFor(db,request)});
   const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
   if(path==='/api/auth/signup'&&method==='POST'){
    const b=await bodyOf(request);await limit(db,'signup:'+ip,5);
    const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';const email=emailValue(b.email);
    if(!/^[a-z0-9_]{3,32}$/.test(username))throw new HttpError(400,'Username must be 3 to 32 letters, numbers, or underscores.');
    if(!emailValid(email))throw new HttpError(400,'Enter a valid recovery email.');
    if(!validPassword(b.password))throw new HttpError(400,'Use a password between 12 and 128 characters.');
    const passwordHash=await hashPassword(b.password);let user;
    try{user=(await db.query('INSERT INTO housing_users(id,username,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,username,email',[randomUUID(),username,email,passwordHash])).rows[0]}catch(e){if(e.code==='23505')throw new HttpError(409,'That username or email is unavailable. Sign in or choose another.');throw e;}
    return json({user:publicUser(user)},201,{'Set-Cookie':await newSession(db,user)});
   }
   if(path==='/api/auth/login'&&method==='POST'){
    const b=await bodyOf(request);const identifier=emailValue(b.identifier);
    if(!identifier||identifier.length>254||typeof b.password!=='string'||b.password.length>128)throw new HttpError(400,'Enter your username or email and password.');
    await limit(db,'login-ip:'+ip,40);await limit(db,'login-account:'+identifier,10);
    const user=(await db.query('SELECT * FROM housing_users WHERE username=$1 OR email=$1',[identifier])).rows[0];
    const valid=await verifyPassword(b.password,user?.password_hash);if(!user||!valid)throw new HttpError(401,'Invalid username, email, or password.');
    return json({user:publicUser(user)},200,{'Set-Cookie':await newSession(db,user)});
   }
   if(path==='/api/auth/forgot-password'&&method==='POST'){
    const b=await bodyOf(request),email=emailValue(b.email);if(!emailValid(email))throw new HttpError(400,'Enter a valid recovery email.');
    await limit(db,'reset-ip:'+ip,10);await limit(db,'reset-account:'+email,3);
    if(!env.RESEND_API_KEY||!env.RESET_FROM_EMAIL||!env.APP_URL)throw new HttpError(503,'Password reset email is not configured. Contact the app administrator.');
    const user=(await db.query('SELECT id FROM housing_users WHERE email=$1',[email])).rows[0];
    if(user){const token=randomToken(),hash=tokenHash(token);await db.query('INSERT INTO housing_resets(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hash,user.id,new Date(Date.now()+30*60000)]);
     const link=new URL('/?reset='+encodeURIComponent(token),env.APP_URL).toString();
     try{await sendEmail({to:email,link,env})}catch{await db.query('DELETE FROM housing_resets WHERE token_hash=$1',[hash]);throw new HttpError(503,'Password reset email could not be sent. Please try again later.');}}
    return json({message:'If an account matches that email, a reset link will arrive shortly. Check your spam folder. The link expires in 30 minutes.'});
   }
   if(path==='/api/auth/reset-password'&&method==='POST'){
    const b=await bodyOf(request);await limit(db,'reset-use:'+ip,15);
    if(typeof b.token!=='string'||!(/^[A-Za-z0-9_-]{43}$/).test(b.token)||!validPassword(b.password))throw new HttpError(400,'Use a valid reset link and a password between 12 and 128 characters.');
    const passwordHash=await hashPassword(b.password);const c=await db.connect();
    try{await c.query('BEGIN');
     // Lock the user first so simultaneous different reset links cannot race.
     const found=await c.query('SELECT u.id FROM housing_users u JOIN housing_resets r ON r.user_id=u.id WHERE r.token_hash=$1 AND r.expires_at>now() FOR UPDATE OF u',[tokenHash(b.token)]);
     if(!found.rows.length)throw new HttpError(400,'This reset link is invalid or expired. Request a new one.');
     const consumed=await c.query('DELETE FROM housing_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',[tokenHash(b.token)]);
     if(!consumed.rows.length)throw new HttpError(400,'This reset link has already been used.');
     const id=consumed.rows[0].user_id;await c.query('UPDATE housing_users SET password_hash=$1 WHERE id=$2',[passwordHash,id]);
     await c.query('DELETE FROM housing_sessions WHERE user_id=$1',[id]);await c.query('DELETE FROM housing_resets WHERE user_id=$1',[id]);await c.query('COMMIT');
    }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
    return json({message:'Password updated. Sign in with your new password.'},200,{'Set-Cookie':sessionCookie('',env.NODE_ENV==='production',0)});
   }
   if(path==='/api/auth/logout'&&method==='POST'){
    await db.query('DELETE FROM housing_sessions WHERE token_hash=$1',[tokenHash(cookieToken(request))]);return json({message:'Signed out.'},200,{'Set-Cookie':sessionCookie('',env.NODE_ENV==='production',0)});
   }
   const user=await userFor(db,request);if(!user)throw new HttpError(401,'Please sign in to continue.');
   if(path==='/api/auth/password'&&method==='POST'){
    const b=await bodyOf(request);await limit(db,'change:'+user.id,10);
    const account=(await db.query('SELECT password_hash FROM housing_users WHERE id=$1',[user.id])).rows[0];
    if(typeof b.currentPassword!=='string'||b.currentPassword.length>128||!await verifyPassword(b.currentPassword,account.password_hash))throw new HttpError(400,'Current password is incorrect.');
    if(!validPassword(b.password))throw new HttpError(400,'Use a password between 12 and 128 characters.');
    if(b.currentPassword===b.password)throw new HttpError(400,'Choose a different password.');
    const passwordHash=await hashPassword(b.password),c=await db.connect();try{await c.query('BEGIN');await c.query('UPDATE housing_users SET password_hash=$1 WHERE id=$2',[passwordHash,user.id]);await c.query('DELETE FROM housing_sessions WHERE user_id=$1',[user.id]);await c.query('DELETE FROM housing_resets WHERE user_id=$1',[user.id]);const cookie=await newSession(c,user);await c.query('COMMIT');return json({message:'Password changed. Other sessions were signed out.'},200,{'Set-Cookie':cookie})}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
   }
   if(path==='/api/scenarios'&&method==='GET')return json({scenarios:(await db.query('SELECT id,name,inputs,reflection,baseline,updated_at FROM housing_scenarios WHERE user_id=$1 ORDER BY lower(name)',[user.id])).rows});
   if(path==='/api/scenarios'&&method==='POST'){
    let doc;try{doc=scenarioDocument(await bodyOf(request))}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,e.message)}
    const result=await db.query(`INSERT INTO housing_scenarios(id,user_id,name,inputs,reflection,baseline) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,name) DO UPDATE SET inputs=EXCLUDED.inputs,reflection=EXCLUDED.reflection,baseline=EXCLUDED.baseline,updated_at=now() RETURNING id,name,inputs,reflection,baseline,updated_at`,[randomUUID(),user.id,doc.name,JSON.stringify(doc.inputs),doc.reflection,doc.baseline?JSON.stringify(doc.baseline):null]);return json({scenario:result.rows[0]});
   }
   const match=path.match(/^\/api\/scenarios\/([0-9a-f-]{36})$/);
   if(match&&method==='DELETE'){const r=await db.query('DELETE FROM housing_scenarios WHERE id=$1 AND user_id=$2 RETURNING id',[match[1],user.id]);if(!r.rows.length)throw new HttpError(404,'Scenario not found.');return json({deleted:true});}
   throw new HttpError(404,'Not found.');
  }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Housing API failed',{code:e.code||'unavailable'});return json({error:'The account service is unavailable. Please try again later.'},503);}
 };
}
async function defaultEmail({to,link,env}){const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.RESET_FROM_EMAIL,to,subject:'Reset your Housing password',text:`Reset your Housing password using this link. It expires in 30 minutes and can be used once.\n\n${link}\n\nIf you did not request this, ignore this email.`}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Email delivery failed.');}
