import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to Buffer for S3 upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/octet-stream';
    const fileName = file.name || `upload_${Date.now()}`;

    // Upload to S3 (Folder: public)
    const s3Url = await uploadToS3(buffer, fileName, "public", mimeType, true);

    // Return the S3 URL
    return NextResponse.json({ url: s3Url });
  } catch (error: any) {
    console.error("Upload processing error:", error);
    return NextResponse.json({ error: "Failed to process file: " + (error.message || String(error)) }, { status: 500 });
  }
}
