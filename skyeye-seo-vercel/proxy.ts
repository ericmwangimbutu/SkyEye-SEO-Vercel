import { NextRequest,NextResponse } from "next/server";
import { authConfigured,authorized } from "./lib/server-auth";
export function proxy(request:NextRequest){
 if(!authConfigured())return new NextResponse("Private dashboard: configure DASHBOARD_USERNAME and a DASHBOARD_PASSWORD of at least 16 characters in Vercel, then redeploy.",{status:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
 if(!authorized(request.headers))return new NextResponse("Authentication required.",{status:401,headers:{"WWW-Authenticate":'Basic realm="SkyEye SEO Workspace", charset="UTF-8"',"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}});
 const response=NextResponse.next();response.headers.set("X-Robots-Tag","noindex, nofollow");return response;
}
export const config={matcher:"/:path*"};
