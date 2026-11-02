import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import defaultApi,{endpointFor} from '../api/index.mjs';
import {createHandler} from './handler.mjs';
process.env.APP_URL ||= 'http://localhost:'+(process.env.PORT||8787);
let api=defaultApi;
if(process.env.HOUSING_LOCAL_DB==='1'&&process.env.NODE_ENV!=='production'){
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite('.local-data');await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));const query=(...args)=>db.query(...args);api=endpointFor(createHandler({poolFactory:()=>({query,connect:async()=>({query,release(){}})})}));
}
const root=resolve('public');const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path.startsWith('/api/'))return await api(req,res);const target=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));if(!target.startsWith(root+'/')){res.writeHead(403).end();return}const content=await readFile(target);res.setHeader('Content-Type',types[extname(target)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.end(content)}catch{res.writeHead(404).end('Not found.')}}).listen(Number(process.env.PORT||8787),'127.0.0.1',()=>console.log('Housing: http://localhost:'+(process.env.PORT||8787)));
