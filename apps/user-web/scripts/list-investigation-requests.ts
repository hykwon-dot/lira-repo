import { NextRequest } from "next/server";
import { GET as listRequests } from "../src/app/api/investigation-requests/route";

async function main() {
  const token = process.argv[2];
  const view = process.argv[3] ?? "assigned";
  if (!token) {
    console.error("Usage: tsx scripts/list-investigation-requests.ts <token> [view]");
    process.exit(1);
  }
  const url = new URL("http://localhost/api/investigation-requests");
  url.searchParams.set("view", view);
  const req = new NextRequest(url, {
    method: "GET",
    headers: new Headers({ Authorization: `Bearer ${token}` }),
  });
  const res = await listRequests(req);
  const data = await res.json();
  console.log("Status:", res.status);
  console.dir(data, { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
