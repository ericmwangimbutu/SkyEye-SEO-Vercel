import { z } from "zod";
export const channels = ["blog", "gbp", "citations", "reviews", "ranks", "competitors"] as const;
export type Channel = typeof channels[number];
export const channelNames: Record<Channel, string> = {blog:"Blog posts",gbp:"GBP content",citations:"Citation building",reviews:"Review generation",ranks:"Rank tracking",competitors:"Competitor monitoring"};
export const statuses: Record<Channel,string[]> = {
  blog:["Planned","Drafting","In review","Scheduled","Published","Blocked"],
  gbp:["Planned","Drafting","In review","Scheduled","Published","Blocked"],
  citations:["To audit","Needs correction","Submitted","Verified","Blocked"],
  reviews:["Planned","Ready","Requested","Follow-up","Received","Blocked"],
  ranks:["To check","Checked","Needs attention","Blocked"],
  competitors:["To review","Reviewing","Action needed","Reviewed","Blocked"]
};
export const doneStatus:Record<Channel,string>={blog:"Published",gbp:"Published",citations:"Verified",reviews:"Received",ranks:"Checked",competitors:"Reviewed"};
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;},"Use a valid date");
const url=z.string().max(1000).refine(v=>!v||/^https?:\/\//i.test(v)&&(()=>{try{return Boolean(new URL(v).hostname)}catch{return false}})(),"Use a full http or https URL");
export const itemSchema=z.object({
 id:z.string().min(1).max(80), channel:z.enum(channels), title:z.string().trim().min(1,"A title is required").max(240),
 status:z.string().max(40), priority:z.enum(["High","Normal","Low"]),owner:z.string().trim().max(80),due:date,
 topic:z.string().max(240),intent:z.enum(["Informational","Commercial","Local","Navigational"]),url,
 notes:z.string().max(8000),sample:z.boolean(),currentRank:z.number().int().min(1).max(100).nullable(),previousRank:z.number().int().min(1).max(100).nullable(),
 location:z.string().max(120),rankType:z.enum(["Organic","Local pack"]),checkedOn:z.union([date,z.literal("")]),
 nap:z.object({name:z.boolean(),address:z.boolean(),phone:z.boolean()}),
}).superRefine((v,ctx)=>{if(!statuses[v.channel].includes(v.status))ctx.addIssue({code:z.ZodIssueCode.custom,path:["status"],message:"Invalid status for this workflow"});});
export type Item=z.infer<typeof itemSchema>;
export const monthSchema=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v=>Number(v.slice(0,4))>=2020&&Number(v.slice(0,4))<=2100);
export const planSchema=z.object({focus:z.string().trim().min(1).max(300),notes:z.string().max(8000)});
export const stateSchema=z.object({month:monthSchema,plan:planSchema,items:z.array(itemSchema).max(500)}).superRefine((v,ctx)=>{
 if(new Set(v.items.map(x=>x.id)).size!==v.items.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:"Duplicate item IDs"});
 if(v.items.some(x=>!x.due.startsWith(v.month)))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Due dates must belong to the selected month"});
});
export type Workspace=z.infer<typeof stateSchema>;
export type SavedWorkspace=Workspace & {version:number;updatedAt:string};
export function isDone(item:Item){return item.status===doneStatus[item.channel];}
export function todayNairobi(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export function filterItems(items:Item[],channel:Channel|"all",status:string,query:string,priority:string="All",due:string="All",today=todayNairobi()){
 const q=query.trim().toLowerCase();return items.filter(x=>(channel==="all"||x.channel===channel)&&(status==="All"||x.status===status)&&(priority==="All"||x.priority===priority)&&(!q||[x.title,x.topic,x.owner,x.notes,x.location].join(" ").toLowerCase().includes(q))&&(due==="All"||due==="Overdue"&&x.due<today&&!isDone(x)||due==="This week"&&x.due>=today&&x.due<=addDays(today,6)&&!isDone(x)));
}
export function addDays(date:string,count:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);}
export function summarize(items:Item[],today=todayNairobi()){return {total:items.length,done:items.filter(isDone).length,blocked:items.filter(x=>x.status==="Blocked").length,overdue:items.filter(x=>x.due<today&&!isDone(x)).length,review:items.filter(x=>["In review","Needs correction","Action needed","Needs attention","Follow-up"].includes(x.status)).length};}
export function monthLabel(month:string){return new Date(month+"-01T12:00:00Z").toLocaleDateString("en-GB",{month:"long",year:"numeric",timeZone:"UTC"});}
export function shiftMonth(month:string,by:number){const d=new Date(month+"-01T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+by);return d.toISOString().slice(0,7);}
export function formatDate(d:string){return new Date(d+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"});}
const postIdeas=[
 ["How to choose a security company in Nairobi","security company Nairobi","Guarding"],
 ["Residential estate security: a practical checklist","estate security Kenya","Residential"],
 ["What to include in a corporate security brief","office security Nairobi","Corporate"],
 ["CCTV installation: questions to ask before you buy","CCTV installation Nairobi","Systems"],
 ["Planning security for a corporate event","event security Kenya","Events"],
 ["Guard patrols and access control: how they work together","security guard patrol services","Guarding"],
 ["Construction site security after working hours","construction security Kenya","Construction"],
 ["Choosing an access control system for your office","access control systems Kenya","Systems"],
 ["What happens during a security risk assessment?","security risk assessment Nairobi","Consulting"],
 ["A property manager’s guide to visitor management","visitor management Nairobi","Residential"],
 ["Alarm monitoring and response: what to expect","alarm monitoring Kenya","Monitoring"],
 ["Retail loss prevention for small businesses","retail security Kenya","Retail"],
 ["Executive protection: planning a discreet assignment","executive protection Kenya","Protection"],
 ["School security without disrupting the school day","school security Kenya","Education"],
 ["How lighting can improve your estate’s security","estate lighting security","CPTED"],
 ["Preparing your venue for a large gathering","venue security planning","Events"],
 ["A guide to security incident reporting","security incident reporting","Guarding"],
 ["CCTV maintenance checks for property owners","CCTV maintenance Kenya","Systems"],
 ["Security planning for places of worship","church security Kenya","Community"],
 ["Fire watch and emergency readiness for buildings","fire safety services Kenya","Fire safety"],
 ["How to assess your perimeter security","perimeter security Nairobi","Systems"],
 ["Night patrols: coverage, reporting and handovers","night patrol services Nairobi","Guarding"],
 ["Security budgeting for a residential estate","estate security costs Kenya","Residential"],
 ["Doorman and concierge support for apartments","concierge security Nairobi","Residential"],
 ["Reducing security risks on industrial sites","industrial security Kenya","Industrial"],
 ["Neighborhood watch: building a useful reporting process","neighborhood watch Kenya","Community"],
 ["What to look for in a security service agreement","security service agreement Kenya","Consulting"],
 ["Event access control: tickets, guests and suppliers","event access control Nairobi","Events"],
 ["Protecting business premises over the holidays","business security Kenya","Corporate"],
 ["When to review your property’s security plan","property security assessment","Consulting"]
];
export function newItem(channel:Channel,month:string):Item{return {id:globalThis.crypto.randomUUID(),channel,title:"",status:statuses[channel][0],priority:"Normal",owner:"Eric",due:month+"-15",topic:"",intent:channel==="gbp"?"Local":"Informational",url:"",notes:"",sample:false,currentRank:null,previousRank:null,location:"Nairobi, Kenya",rankType:"Organic",checkedOn:"",nap:{name:false,address:false,phone:false}};}
export function seedMonth(month:string):Workspace{
 const demo=month==="2026-10";const items:Item[]=[];const days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const make=(channel:Channel,title:string,index:number,extra:Partial<Item>={})=>{const base={...newItem(channel,month),id:`${month}-${channel}-${index}`,title,sample:true,due:`${month}-${String(Math.min(28,index*3+2)).padStart(2,"0")}`};items.push({...base,...extra});};
 postIdeas.forEach(([title,keyword,cluster],i)=>make("blog",title,i,{topic:keyword,location:cluster,due:month+"-"+String(Math.min(days,i+1)).padStart(2,"0"),intent:i%3===0?"Commercial":"Informational",status:demo?(i<6?"Published":i<9?"In review":i<14?"Drafting":i===17||i===24?"Blocked":"Planned"):"Planned",priority:i%5===0?"High":"Normal",notes:`Brief: answer the reader’s main question, include a practical checklist, and link to the relevant SkyEye service. Confirm service details with the client before publication.${i===17?" Awaiting approved maintenance checklist.":""}`,url:""}));
 ["Meet the team behind estate protection","A safer event starts with a good plan","Office access control: three useful checks","Service spotlight: central monitoring","Security tips for property managers","Construction site security checklist","How to request a site assessment","October service recap"].forEach((title,i)=>make("gbp",title,i,{topic:i%2?"Service update":"Educational post",status:demo?(i<2?"Published":i<4?"In review":"Planned"):"Planned",notes:"Draft a short GBP update with one useful takeaway. Add an approved original photo and the relevant service link. No posting is connected."}));
 ["Google Business Profile","Bing Places","Apple Business Connect","Kenya business directory · sample","Local chamber directory · sample","Industry directory · sample","Regional directory · sample","Business listings portal · sample","Property services directory · sample","Trade directory · sample"].forEach((title,i)=>make("citations",title,i,{topic:i<3?"Primary listing":"Directory prospect",status:demo?(i<3?"Verified":i<5?"Submitted":i===5?"Needs correction":"To audit"):"To audit",nap:{name:demo&&i<6,address:demo&&i<3,phone:demo&&i<5},notes:"Verify the official business name, physical address and telephone against the client-approved NAP record. Directory prospects need eligibility and quality checks. Sample status; no listing has been changed."}));
 ["Estate management · client A","Corporate facilities · client B","Event organiser · client C","Retail management · client D","Construction manager · client E","Property administrator · client F","Office operations · client G","Venue manager · client H"].forEach((title,i)=>make("reviews",title,i,{topic:i%2?"Email request":"WhatsApp request",status:demo?(i<2?"Received":i<4?"Requested":i===4?"Follow-up":"Ready"):"Planned",notes:"Request template: Thank you for choosing SkyEye. If you would like to share your experience, please leave an honest review using our approved review link.\n\nUse only with client permission. No messages are sent from this dashboard. Client labels are fictitious."}));
 const keywords=["security company Nairobi","security guards Nairobi","estate security Kenya","event security Nairobi","CCTV installation Nairobi","alarm monitoring Kenya","executive protection Kenya","construction site security Kenya"];
 const current=[8,12,6,15,18,9,14,11],previous=[11,14,5,19,22,12,14,10];
 keywords.forEach((title,i)=>make("ranks",title,i,{topic: i%3===0?"Local pack":"Organic search",status:demo?(i===2||i===7?"Needs attention":"Checked"):"To check",currentRank:demo?(i%3===0?[2,3,1][i/3]:current[i]):null,previousRank:demo?(i%3===0?[3,2,2][i/3]:previous[i]):null,rankType:i%3===0?"Local pack":"Organic",checkedOn:demo?month+"-02":"",due:month+"-28",notes:"Illustrative ranks only. Replace with measurements from a consistent location, device and search type. Record the check date. Blank rank means not measured or outside the top 100."}));
 ["Atlas Guard · fictional","Sentinel Secure · fictional","Urban Shield · fictional","Metro Watch · fictional"].forEach((title,i)=>make("competitors",title,i,{topic:["Estate security content","Local search presence","CCTV service pages","Event security guides"][i],url:`https://example.com/competitor-${i+1}`,status:demo?(i===0?"Reviewed":i===1?"Action needed":"To review"):"To review",priority:i===1?"High":"Normal",notes:["Sample observation: a detailed estate-security FAQ suggests an opportunity for a better checklist. Verify against a real competitor before using.","Sample opportunity: add clearer service-area coverage and locally relevant proof to our service pages.","Review service structure, internal links and proof of installation experience. Record a verified source URL.","Compare topic coverage, freshness and conversion paths. Do not copy competitor content."][i]}));
 return {month,plan:{focus:"Grow qualified Nairobi security enquiries",notes:"Prioritise residential estates, corporate guarding and security systems.\n30 useful blog posts, eight GBP updates, and a weekly local-search check.\nConfirm business details and obtain client approval before any external action."},items};
}
