import { seedMonth,stateSchema,type SavedWorkspace,type Workspace } from "./workspace-model";
type Stored={month:string;content:Workspace;version:number;updated_at:string};
function connection(){
 const base=process.env.SUPABASE_URL?.replace(/\/$/,"");const key=process.env.SUPABASE_SECRET_KEY;
 if(!base||!key||!key.startsWith("sb_secret_"))throw new Error("Supabase storage is not configured");
 const parsed=new URL(base);if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=="/")throw new Error("Use the HTTPS Supabase project origin");
 return {base,key};
}
async function request(path:string,method="GET",body?:unknown,prefer?:string){
 const {base,key}=connection();const response=await fetch(`${base}/rest/v1/skyeye_workspaces${path}`,{method,headers:{apikey:key,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Workspace storage returned ${response.status}`);
 const text=await response.text();return text?JSON.parse(text):null;
}
function unpack(row:Stored):SavedWorkspace{const content=stateSchema.parse(row.content);return {...content,version:row.version,updatedAt:row.updated_at};}
export async function loadWorkspace(month:string):Promise<SavedWorkspace>{
 await request("?on_conflict=month","POST",{month,content:seedMonth(month),version:1,updated_at:new Date().toISOString()},"resolution=ignore-duplicates,return=minimal");
 const rows=await request(`?month=eq.${encodeURIComponent(month)}&select=month,content,version,updated_at&limit=1`) as Stored[];
 if(!rows?.[0])throw new Error("Monthly workspace was not found");return unpack(rows[0]);
}
export async function saveWorkspace(data:Workspace,version:number):Promise<SavedWorkspace|null>{
 const rows=await request(`?month=eq.${encodeURIComponent(data.month)}&version=eq.${version}`,"PATCH",{content:data,version:version+1,updated_at:new Date().toISOString()},"return=representation") as Stored[];
 return rows?.[0]?unpack(rows[0]):null;
}
