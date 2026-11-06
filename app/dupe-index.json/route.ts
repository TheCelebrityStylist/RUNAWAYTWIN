import { getDupeIndex } from "@/lib/drops";

export const revalidate = 3600;

// Open data behind the Dupe Index. Free to cite with a link to https://runwaytwin.com/dupe-index.
export async function GET() {
  const x = await getDupeIndex();
  return Response.json(
    { source: "RunwayTwin Dupe Index", url: "https://runwaytwin.com/dupe-index", license: "CC BY 4.0", ...x },
    { headers: { "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" } },
  );
}
