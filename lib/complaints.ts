import { del, list, put } from "@vercel/blob";

export type Complaint = {
  id: string;
  category: "focus" | "general";
  date: string;
  endDate?: string;
  title: string;
  content: string;
  agency: string;
  images?: Array<{ url: string; uploadedAt: string }>;
};
const pathname = "data/complaints.json";
const initial: Complaint[] = [];

export async function readComplaints() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return initial;
  const blobs = await list({ prefix: pathname });
  const blob = blobs.blobs.find((item) => item.pathname === pathname);
  if (!blob) { await writeComplaints(initial); return initial; }
  const response = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
  const items = await response.json() as Complaint[];
  const expiresAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const expiredUrls = items.flatMap((item) => item.images || []).filter((image) => new Date(image.uploadedAt).getTime() < expiresAt).map((image) => image.url);
  if (expiredUrls.length) {
    await del(expiredUrls);
    const cleaned = items.map((item) => ({ ...item, images: (item.images || []).filter((image) => !expiredUrls.includes(image.url)) }));
    await writeComplaints(cleaned);
    return cleaned;
  }
  return items;
}

export async function deleteImages(urls: string[]) {
  if (urls.length && process.env.BLOB_READ_WRITE_TOKEN) await del(urls);
}

export async function writeComplaints(items: Complaint[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Storage is not connected");
  const existing = await list({ prefix: pathname });
  await put(pathname, JSON.stringify(items), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
