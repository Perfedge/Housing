import {mkdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
await mkdir('public/vendor',{recursive:true});
for(const [source,dest] of [['jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'],['exceljs/dist/exceljs.min.js','exceljs.min.js']])await copyFile(require.resolve(source),'public/vendor/'+dest);
// Ship the licenses alongside self-hosted dependencies.
await copyFile(require.resolve('jspdf/package.json').replace(/package.json$/,'LICENSE'),'public/vendor/jspdf-LICENSE.txt');
await copyFile(require.resolve('exceljs/package.json').replace(/package.json$/,'LICENSE'),'public/vendor/exceljs-LICENSE.txt');
console.log('Housing static assets ready.');

if(process.env.DATABASE_URL) await import('./migrate.mjs');
