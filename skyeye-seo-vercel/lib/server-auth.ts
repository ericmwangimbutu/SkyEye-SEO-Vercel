import { createHash, timingSafeEqual } from "node:crypto";
export function authConfigured(){return Boolean(process.env.DASHBOARD_USERNAME?.trim())&&Boolean(process.env.DASHBOARD_PASSWORD&&process.env.DASHBOARD_PASSWORD.length>=16);}
function equal(a:string,b:string){return timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());}
export function authorized(requestHeaders:Pick<Headers,"get">){
 if(!authConfigured())return false;
 const header=requestHeaders.get("authorization");if(!header||!/^Basic /i.test(header)||header.length>8192)return false;
 try{const decoded=Buffer.from(header.slice(6),"base64").toString("utf8");const colon=decoded.indexOf(":");if(colon<0)return false;const user=decoded.slice(0,colon),password=decoded.slice(colon+1);const goodUser=equal(user,process.env.DASHBOARD_USERNAME!);const goodPassword=equal(password,process.env.DASHBOARD_PASSWORD!);return goodUser&&goodPassword;}catch{return false;}
}
