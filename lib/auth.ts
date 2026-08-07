import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "todayedc_admin";
type AdminAccount = { username: string; password: string };
function secret() { const value = process.env.AUTH_SECRET; if (!value) throw new Error("AUTH_SECRET is required"); return value; }
function accounts() {
  let admins: AdminAccount[] = [];
  try { admins = JSON.parse(process.env.ADMIN_ACCOUNTS || "[]"); } catch { return []; }
  return admins;
}
function signature(username: string) { return createHmac("sha256", secret()).update(`todayedc-admin-session:${username}`).digest("hex"); }
export async function getAdminUsername() {
  const value = (await cookies()).get(cookieName)?.value || "";
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const username = value.slice(0, separator);
  const supplied = value.slice(separator + 1);
  const expected = signature(username);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  return accounts().some((admin) => admin.username === username) ? username : null;
}
export async function isAdmin() { return Boolean(await getAdminUsername()); }
export async function setAdminCookie(username: string) { (await cookies()).set(cookieName, `${username}.${signature(username)}`, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"strict", maxAge:60*60*8, path:"/" }); }
export function validCredentials(username: string, password: string) { return accounts().some((admin) => username === admin.username && password === admin.password); }
export function authorName(username: string) { return username === "edcdelta" ? "DELTA" : "민원"; }
