import { isAdmin, setAdminCookie, validCredentials } from "../../../lib/auth";
export async function GET() { return new Response(null, { status: await isAdmin() ? 204 : 401 }); }
export async function POST(request: Request) { const body = await request.json() as { username?:string; password?:string }; if (!validCredentials(body.username || "", body.password || "")) return Response.json({ error:"Unauthorized" }, { status:401 }); await setAdminCookie(); return Response.json({ ok:true }); }
