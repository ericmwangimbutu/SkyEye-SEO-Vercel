import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';
const modelTest=spawnSync(process.execPath,['tests/validate-model.mjs'],{stdio:'inherit'});assert.equal(modelTest.status,0);
await fs.mkdir('.validation',{recursive:true});
await fs.writeFile('.validation/headers.mjs','export async function headers(){return globalThis.__requestHeaders;}');
for(const [sourcePath,target,replacements] of [
 ['lib/server-auth.ts','server-auth',[]],
 ['lib/workspace-store.ts','workspace-store',[[ '"./workspace-model"','"./workspace-model.mjs"']]],
 ['proxy.ts','proxy',[[ '"./lib/server-auth"','"./server-auth.mjs"'],['"next/server"','"next/server.js"']]],
 ['app/api/workspace/route.ts','route',[[ '"next/headers"','"./headers.mjs"'],['"../../../lib/server-auth"','"./server-auth.mjs"'],['"../../../lib/workspace-store"','"./workspace-store.mjs"'],['"../../../lib/workspace-model"','"./workspace-model.mjs"']]]
]){
 let code=await fs.readFile(sourcePath,'utf8');for(const [a,b] of replacements)code=code.replace(a,b);
 await fs.writeFile(`.validation/${target}.mjs`,ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const auth=await import('../.validation/server-auth.mjs');
const {proxy}=await import('../.validation/proxy.mjs');
const {NextRequest}=await import('next/server.js');
const route=await import('../.validation/route.mjs');
const model=await import('../.validation/workspace-model.mjs');
const origin='https://skyeye.example.test';const token=Buffer.from('eric:fixture-password-is-unique-123').toString('base64');
const headers=new Headers({Authorization:`Basic ${token}`});
assert.equal(auth.authorized(headers),false,'unconfigured authentication fails closed');
assert.equal(proxy(new NextRequest(origin)).status,503);
process.env.DASHBOARD_USERNAME='eric';process.env.DASHBOARD_PASSWORD='too-short';assert.equal(auth.authorized(headers),false);
process.env.DASHBOARD_PASSWORD='fixture-password-is-unique-123';
assert.equal(auth.authorized(headers),true);assert.equal(auth.authorized(new Headers()),false);assert.equal(auth.authorized(new Headers({Authorization:'Bearer forged'})),false);
assert.equal(proxy(new NextRequest(origin)).status,401);assert.ok(proxy(new NextRequest(origin)).headers.get('WWW-Authenticate').includes('Basic'));
assert.equal(proxy(new NextRequest(origin,{headers})).status,200);
assert.equal(proxy(new NextRequest(origin+'/_next/static/app.js')).status,401,'static assets are protected too');
process.env.SUPABASE_URL='https://fixture.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_fixture_only_not_a_real_key';
const rows=new Map();const calls=[];const realFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input);assert.equal(url.origin,process.env.SUPABASE_URL);assert.equal(options.headers.apikey,process.env.SUPABASE_SECRET_KEY);assert.equal(options.headers.Authorization,undefined,'modern secret keys are not bearer JWTs');assert.equal(options.cache,'no-store');calls.push({url,method:options.method});
 const body=options.body?JSON.parse(options.body):null;const month=url.searchParams.get('month')?.replace('eq.','');
 if(options.method==='POST'){if(!rows.has(body.month))rows.set(body.month,structuredClone(body));return new Response(null,{status:201});}
 if(options.method==='GET')return Response.json(rows.has(month)?[structuredClone(rows.get(month))]:[]);
 if(options.method==='PATCH'){const row=rows.get(month),version=Number(url.searchParams.get('version')?.replace('eq.',''));if(!row||row.version!==version)return Response.json([]);Object.assign(row,body);return Response.json([structuredClone(row)]);}
 throw new Error('Unsupported test operation');
};
globalThis.__requestHeaders=headers;
const get=month=>route.GET(new Request(`${origin}/api/workspace?month=${month}`));
const put=(data,version,requestOrigin=origin)=>route.PUT(new Request(`${origin}/api/workspace`,{method:'PUT',headers:{'Content-Type':'application/json',Origin:requestOrigin},body:JSON.stringify({data,version})}));
const initial=await get('2026-10');assert.equal(initial.status,200);const data=await initial.json();assert.equal(data.items.length,68);
const edit=structuredClone(data);edit.items[6].title='Approved monthly article';edit.items[6].owner='Eric';edit.items[6].status='Published';edit.plan.focus='Editable monthly focus';
const response=await put(edit,data.version);assert.equal(response.status,200);const saved=await response.json();assert.equal(saved.version,2);assert.equal(model.summarize(saved.items).done,21);
const readback=await (await get('2026-10')).json();assert.equal(readback.items[6].title,'Approved monthly article');assert.equal(readback.plan.focus,'Editable monthly focus');
assert.equal((await put(edit,data.version)).status,409);const bad=structuredClone(edit);bad.items[0].due='2026-11-01';assert.equal((await put(bad,saved.version)).status,400);assert.equal((await put(edit,saved.version,'https://untrusted.example')).status,403);
const november=await (await get('2026-11')).json();assert.equal(model.summarize(november.items).done,0);assert.ok(november.items.every(x=>x.due.startsWith('2026-11')));
globalThis.__requestHeaders=new Headers();const count=calls.length;assert.equal((await get('2026-10')).status,401);assert.equal((await put(edit,saved.version)).status,401);assert.equal(calls.length,count,'unauthorized requests do not access storage');
globalThis.__requestHeaders=headers;globalThis.fetch=async()=>new Response('Unavailable',{status:503});const consoleError=console.error;console.error=()=>{};assert.equal((await get('2026-10')).status,503);assert.equal((await put(edit,saved.version)).status,503);console.error=consoleError;globalThis.fetch=realFetch;
console.log('PASS: fail-closed authentication, protected assets, authenticated API, modern Supabase request contracts, edits/read-back, conflict detection, monthly isolation and recoverable storage failures.');
