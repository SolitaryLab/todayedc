import { del, list, put } from "@vercel/blob";

export type Complaint = { id: string; date: string; title: string; content: string; agency: string };
const pathname = "data/complaints.json";
const initial: Complaint[] = [
  { id: "sample-1", date: "2026-08-07", title: "통학로 주변 불법 주정차 단속을 요청합니다", content: "아이들이 이용하는 통학로 주변에 불법 주정차 차량이 많아 보행 시야가 가려지고 있습니다. 등하교 시간대 집중 단속과 안전 표지 설치를 요청드립니다.", agency: "관할 구청 교통행정과" },
  { id: "sample-2", date: "2026-08-07", title: "공원 내 노후 운동기구 정비 요청", content: "주민들이 자주 이용하는 공원 운동기구 일부가 파손되어 안전사고가 우려됩니다. 현장 점검 후 신속한 보수 또는 교체를 부탁드립니다.", agency: "관할 구청 공원녹지과" },
  { id: "sample-3", date: "2026-08-06", title: "횡단보도 신호시간 연장을 요청합니다", content: "고령자와 어린이가 많이 이용하는 횡단보도의 보행 신호가 너무 짧습니다. 현장 여건을 확인하여 보행 신호시간 연장을 검토해 주시기 바랍니다.", agency: "관할 경찰서 교통과" }
];

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
  await Promise.all(existing.blobs.filter((item) => item.pathname === pathname).map((item) => del(item.url)));
  await put(pathname, JSON.stringify(items), { access: "public", addRandomSuffix: false, contentType: "application/json" });
}
