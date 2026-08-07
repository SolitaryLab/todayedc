import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "todayedc_admin";
function secret() { const value = process.env.AUTH_SECRET; if (!value) throw new Error("AUTH_SECRET is required"); return value; }
function token() { return createHmac("sha256", secret()).update("todayedc-admin-session").digest("hex"); }
export async function isAdmin() { const value = (await cookies()).get(cookieName)?.value || ""; const expected = token(); return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected)); }
export async function setAdminCookie() { (await cookies()).set(cookieName, token(), { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"strict", maxAge:60*60*8, path:"/" }); }
export function validCredentials(username: string, password: string) {
  let admins: Array<{ username: string; password: string }> = [];
  try { admins = JSON.parse(process.env.ADMIN_ACCOUNTS || "[]"); } catch { return false; }
  return admins.some((admin) => username === admin.username && password === admin.password);
}
