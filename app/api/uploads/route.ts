import { put } from "@vercel/blob";
import { isAdmin } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return Response.json({ error: "Storage is not connected" }, { status: 503 });
  const form = await request.formData();
  const files = form.getAll("images").filter((value): value is File => value instanceof File).slice(0, 2);
  if (!files.length) return Response.json({ images: [] });
  if (files.some((file) => !file.type.startsWith("image/") || file.size > 4 * 1024 * 1024)) return Response.json({ error: "Invalid image" }, { status: 400 });
  const uploadedAt = new Date().toISOString();
  const images = await Promise.all(files.map(async (file) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const blob = await put(`complaints/${Date.now()}-${crypto.randomUUID()}-${safeName}`, file, { access: "private" });
    return { url: blob.url, uploadedAt };
  }));
  return Response.json({ images });
}
