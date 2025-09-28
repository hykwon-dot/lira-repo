import { NextRequest } from "next/server";
import { POST as loginHandler } from "../src/app/api/login/route";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: tsx scripts/login.ts <email> <password>");
    process.exit(1);
  }
  const req = new NextRequest("http://localhost/api/login", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify({ email, password }),
  });
  const res = await loginHandler(req);
  const data = await res.json();
  console.log("Status:", res.status);
  console.dir(data, { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
