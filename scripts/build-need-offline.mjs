import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const [html,css,model,ui]=await Promise.all(['public/need-estimator.html','public/need.css','public/need-model.mjs','public/need-ui.mjs'].map(p=>readFile(new URL(p,root),'utf8')));
const js=model.replace(/^export /gm,'')+'\n'+ui.replace(/^import .*?;\n/,'');
if(js.includes('</script'))throw Error('Unexpected script closing tag.');
const standalone=html.replace('<link rel="stylesheet" href="need.css"><script type="module" src="need-ui.mjs"></script>',()=>'<style>'+css+'</style>').replace('</body>',()=>'<script>'+js+'</script></body>');
await mkdir(new URL('output/need-estimator/',root),{recursive:true});
await writeFile(new URL('output/need-estimator/Healdsburg-Housing-Need-Estimator.html',root),standalone);
console.log('Created standalone estimator for offline review. Links back to the planning lab require the hosted app.');
