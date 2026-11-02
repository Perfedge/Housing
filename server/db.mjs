import pg from 'pg';
let pool;
export function getPool(){if(!process.env.DATABASE_URL)throw Error('Housing database is not configured.');return pool ||= new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:20000,connectionTimeoutMillis:10000});}
