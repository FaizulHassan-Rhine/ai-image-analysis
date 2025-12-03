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

    if (!process.env.CLARIFAI_API_KEY) {
      return NextResponse.json(
        { error: "Clarifai API key not configured" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Clarifai requires user_id and app_id in the URL
    // Using a general image recognition model since ai-deepfake doesn't exist
    const userId = process.env.CLARIFAI_USER_ID || "clarifai";
    const appId = process.env.CLARIFAI_APP_ID || "main";
    
    // Using general-image-recognition model which is more widely available
    const res = await fetch(
      `https://api.clarifai.com/v2/users/${userId}/apps/${appId}/models/general-image-recognition/outputs`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.CLARIFAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: [
            {
              data: {
                image: { base64: buffer },
              },
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Clarifai API error: ${res.status}`, details: errorText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ model: "clarifai", data });
  } catch (error) {
    console.error("Clarifai API error:", error);
    return NextResponse.json(
      { error: "Failed to process request", message: error.message },
      { status: 500 }
    );
  }
}
