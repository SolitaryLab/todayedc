import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return new Response("Invalid image", { status: 400 });
  const source = new URL(url);
  if (source.protocol !== "https:" || !source.hostname.endsWith(".blob.vercel-storage.com")) return new Response("Invalid image", { status: 400 });
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
