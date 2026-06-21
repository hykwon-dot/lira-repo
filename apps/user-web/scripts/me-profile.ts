import { NextRequest } from "next/server";
import { GET as profileGet } from "../src/app/api/me/profile/route";

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error("Usage: tsx scripts/me-profile.ts <token>");
    process.exit(1);
  }
  const req = new NextRequest("http://localhost/api/me/profile", {
    method: "GET",
    headers: new Headers({ Authorization: `Bearer ${token}` }),
  });
  const res = await profileGet(req);
  const data = await res.json();
  console.log("Status:", res.status);
  console.dir(data, { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
