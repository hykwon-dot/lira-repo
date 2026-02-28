import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Sanitize filename: replace spaces and non-alphanumeric chars (except ._-) with -
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const filename = `${uniqueSuffix}-${originalName}`;
    
    // Directory path
    const uploadDir = join(process.cwd(), "public", "uploads");
    
    // Ensure uploads directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // In Next.js dev server, public files are served directly.
    // In production, serving uploaded files from disk might require extra config or a custom server depending on deployment.
    // For now assuming a filesystem-based deployment or local dev.
    const fileUrl = `/uploads/${filename}`;
    
    console.log(`File uploaded successfully: ${filePath}`);
    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error("Upload error details:", error);
    return NextResponse.json({ error: "Failed to upload file: " + (error.message || String(error)) }, { status: 500 });
  }
}
