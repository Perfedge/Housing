import {readFile} from 'node:fs/promises';
import {getPool} from '../server/db.mjs';
const pool=getPool();try{await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));console.log('Housing schema ready.')}finally{await pool.end()}
