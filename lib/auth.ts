import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "todayedc_admin";
function secret() { return process.env.AUTH_SECRET || "todayedc-change-this-secret-in-production"; }
function token() { return createHmac("sha256", secret()).update("todayedc-admin-session").digest("hex"); }
export async function isAdmin() { const value = (await cookies()).get(cookieName)?.value || ""; const expected = token(); return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected)); }
export async function setAdminCookie() { (await cookies()).set(cookieName, token(), { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"strict", maxAge:60*60*8, path:"/" }); }
export function validCredentials(username: string, password: string) { return username === (process.env.ADMIN_USERNAME || "edcminwon") && password === (process.env.ADMIN_PASSWORD || "edc2026"); }
