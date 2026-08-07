import { list, put } from "@vercel/blob";

export type Complaint = { id: string; date: string; title: string; content: string; agency: string };
const pathname = "data/complaints.json";
const initial: Complaint[] = [];

export async function readComplaints() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return initial;
  const blobs = await list({ prefix: pathname });
  const blob = blobs.blobs.find((item) => item.pathname === pathname);
  if (!blob) { await writeComplaints(initial); return initial; }
  const response = await fetch(`${blob.url}?v=${Date.now()}`, { cache: "no-store" });
  return await response.json() as Complaint[];
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
