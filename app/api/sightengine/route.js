import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!process.env.SIGHTENGINE_USER || !process.env.SIGHTENGINE_SECRET) {
      return NextResponse.json(
        { error: "Sightengine API credentials not configured" },
        { status: 500 }
      );
    }

    // Use native FormData (available in Node.js 18+)
    // Create a File object from the buffer for proper multipart encoding
    const buffer = await file.arrayBuffer();
    const fileBlob = new Blob([buffer], { 
      type: file.type || "image/jpeg" 
    });
    
    // Create a File object (File extends Blob with name property)
    const fileObj = new File([fileBlob], file.name || "image.jpg", {
      type: file.type || "image/jpeg"
    });
    
    const formData = new FormData();
    formData.append("media", fileObj);
    
    const url = `https://api.sightengine.com/1.0/check.json?models=nudity,offensive,face-attributes&api_user=${process.env.SIGHTENGINE_USER}&api_secret=${process.env.SIGHTENGINE_SECRET}`;

    const result = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!result.ok) {
      const errorText = await result.text();
      return NextResponse.json(
        { error: `Sightengine API error: ${result.status}`, details: errorText },
        { status: result.status }
      );
    }

    const data = await result.json();
    return NextResponse.json({ model: "sightengine", data });
  } catch (error) {
    console.error("Sightengine API error:", error);
    return NextResponse.json(
      { error: "Failed to process request", message: error.message },
      { status: 500 }
    );
  }
}
