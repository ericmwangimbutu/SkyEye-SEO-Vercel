import { headers } from "next/headers";
import { authorized } from "../../../lib/server-auth";
import { loadWorkspace,saveWorkspace } from "../../../lib/workspace-store";
import { monthSchema,stateSchema } from "../../../lib/workspace-model";
import { z } from "zod";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function allowed(){return authorized(await headers());}
export async function GET(request:Request){
 if(!await allowed())return json({error:"Sign in to open your workspace."},401);
 const month=monthSchema.safeParse(new URL(request.url).searchParams.get("month"));
 if(!month.success)return json({error:"Choose a valid month."},400);
 try{return json(await loadWorkspace(month.data));}catch(e){console.error("Load workspace",e);return json({error:"The workspace could not load. Please try again."},503);}
}
export async function PUT(request:Request){
 if(!await allowed())return json({error:"Sign in before saving."},401);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return json({error:"This save request is not allowed."},403);
 if(request.headers.get("content-type")?.split(";")[0]!=="application/json")return json({error:"Use JSON for this request."},415);
 if(Number(request.headers.get("content-length")||0)>500000)return json({error:"Plan is too large."},413);
 let raw:unknown;try{const text=await request.text();if(text.length>500000)return json({error:"Plan is too large."},413);raw=JSON.parse(text);}catch{return json({error:"Invalid request."},400);}
 const parsed=z.object({data:stateSchema,version:z.number().int().positive()}).safeParse(raw);
 if(!parsed.success)return json({error:parsed.error.issues[0]?.message||"Check your fields."},400);
 try{const saved=await saveWorkspace(parsed.data.data,parsed.data.version);if(!saved)return json({error:"This month was changed in another session. Reload the month before saving again. Your draft is still open."},409);return json(saved);}catch(e){console.error("Save workspace",e);return json({error:"Changes could not be saved. Your draft is still open; please try again."},503);}
}
