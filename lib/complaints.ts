import { del, get, list, put } from "@vercel/blob";

export type Complaint = {
  id: string;
  category: "focus" | "general";
  date: string;
  endDate?: string;
  title: string;
  content: string;
  agency: string;
  createdAt: string;
  createdBy: string;
  author: string;
  images?: Array<{ url: string; uploadedAt: string }>;
};
const pathname = "data/complaints.json";
const initial: Complaint[] = [];

export async function readComplaints() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return initial;
  const blobs = await list({ prefix: pathname });
  const blob = blobs.blobs.find((item) => item.pathname === pathname);
  if (!blob) { await writeComplaints(initial); return initial; }
  const response = await get(blob.url, { access: "private", useCache: false });
  if (!response || response.statusCode !== 200) return initial;
  const stored = JSON.parse(await new Response(response.stream).text()) as Array<Partial<Complaint>>;
  let ownershipMigrated = false;
  const items = stored.map((item) => {
    const legacyOwner = !item.createdBy || item.createdBy === "edcminwon";
    if (legacyOwner || item.author === "민원") ownershipMigrated = true;
    return {
      ...item,
      createdAt: item.createdAt || `${item.date || "2026-01-01"}T00:00:00.000Z`,
      createdBy: legacyOwner ? "edcdelta" : item.createdBy,
      author: legacyOwner || item.author === "민원" ? "DELTA" : item.author,
    };
  }) as Complaint[];
  const expiresAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const expiredUrls = items.flatMap((item) => item.images || []).filter((image) => new Date(image.uploadedAt).getTime() < expiresAt).map((image) => image.url);
  if (expiredUrls.length) {
    await del(expiredUrls);
    const cleaned = items.map((item) => ({ ...item, images: (item.images || []).filter((image) => !expiredUrls.includes(image.url)) }));
    await writeComplaints(cleaned);
    return cleaned;
  }
  if (ownershipMigrated) await writeComplaints(items);
  return items;
}

export async function deleteImages(urls: string[]) {
  if (urls.length && (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) await del(urls);
}

export async function writeComplaints(items: Complaint[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new Error("Storage is not connected");
  const existing = await list({ prefix: pathname });
  await put(pathname, JSON.stringify(items), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
