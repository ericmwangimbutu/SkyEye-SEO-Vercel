import Dashboard from "./workspace";
import { headers } from "next/headers";
import { authorized } from "@/lib/server-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!authorized(await headers())) return <main>Authentication required.</main>;
  return <Dashboard />;
}
