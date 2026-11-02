import {createHandler} from '../server/handler.mjs';
export function endpointFor(handle){return async function endpoint(req,res){
 const host=process.env.APP_URL||`https://${req.headers.host}`;
 const url=new URL(req.url,host);const route=url.searchParams.get('route');if(route&&/^[a-z0-9/-]+$/i.test(route))url.pathname='/api/'+route;let size=0;const chunks=[];
 if(req.body!==undefined){const body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);size=Buffer.byteLength(body);if(size>50000){res.statusCode=413;res.end(JSON.stringify({error:'Request too large.'}));return}chunks.push(Buffer.from(body));}
 else if(!['GET','HEAD'].includes(req.method)){
  for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>50000){res.statusCode=413;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Request too large.'}));return}chunks.push(Buffer.from(chunk))}
 }
 const request=new Request(url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
 const response=await handle(request);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await response.arrayBuffer()));
}
}
export default endpointFor(createHandler());
