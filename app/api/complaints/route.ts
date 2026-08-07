import { isAdmin } from "../../../lib/auth";
import { Complaint, deleteImages, readComplaints, writeComplaints } from "../../../lib/complaints";
export const dynamic = "force-dynamic";
const clean = (body: Partial<Complaint>): Complaint => ({
  id: body.id || crypto.randomUUID(),
  category: body.category === "focus" ? "focus" : "general",
  date: String(body.date || "").slice(0, 10),
  endDate: body.endDate ? String(body.endDate).slice(0, 10) : undefined,
  title: String(body.title || "").trim(),
  content: String(body.content || "").trim(),
  agency: String(body.agency || "").trim(),
  images: Array.isArray(body.images) ? body.images.slice(0, 2).filter((image) => image && typeof image.url === "string" && typeof image.uploadedAt === "string") : [],
});
function valid(item: Complaint) { return item.date.length === 10 && (!item.endDate || item.endDate >= item.date) && item.title.length > 0 && item.content.length > 0 && item.agency.length > 0; }
export async function GET() { const items = await readComplaints(); return Response.json({ items:items.sort((a,b) => b.date.localeCompare(a.date)) }); }
export async function POST(request: Request) { if (!await isAdmin()) return Response.json({ error:"Unauthorized" }, { status:401 }); const item=clean(await request.json()); if (!valid(item)) return Response.json({ error:"Invalid" }, { status:400 }); const items=await readComplaints(); await writeComplaints([item,...items]); return Response.json({ item }); }
export async function PUT(request: Request) { if (!await isAdmin()) return Response.json({ error:"Unauthorized" }, { status:401 }); const item=clean(await request.json()); if (!valid(item)) return Response.json({ error:"Invalid" }, { status:400 }); const items=await readComplaints(); const previous=items.find((old) => old.id === item.id); const nextUrls=new Set((item.images || []).map((image) => image.url)); await deleteImages((previous?.images || []).filter((image) => !nextUrls.has(image.url)).map((image) => image.url)); await writeComplaints(items.map((old) => old.id === item.id ? item : old)); return Response.json({ item }); }
export async function DELETE(request: Request) { if (!await isAdmin()) return Response.json({ error:"Unauthorized" }, { status:401 }); const id=new URL(request.url).searchParams.get("id"); const items=await readComplaints(); const target=items.find((item) => item.id === id); await deleteImages((target?.images || []).map((image) => image.url)); await writeComplaints(items.filter((item) => item.id !== id)); return Response.json({ ok:true }); }
