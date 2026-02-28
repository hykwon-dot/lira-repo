import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to Base64 Data URI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/octet-stream';
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Return the Data URI directly. 
    // The frontend will receive this and save it to the database 'imageUrl' field.
    return NextResponse.json({ url: dataUri });
  } catch (error: any) {
    console.error("Upload processing error:", error);
    return NextResponse.json({ error: "Failed to process file: " + (error.message || String(error)) }, { status: 500 });
  }
}
