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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Get a free API key at https://aistudio.google.com/" },
        { status: 500 }
      );
    }

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Validate API key first
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
      const testRes = await fetch(testUrl);
      const testData = await testRes.json();
      
      if (!testRes.ok) {
        const errorCode = testData.error?.code;
        const errorMessage = testData.error?.message || "Invalid API key";
        
        if (errorCode === 400 || errorMessage.includes("API key not valid") || errorMessage.includes("INVALID_ARGUMENT")) {
          return NextResponse.json(
            {
              error: "Invalid Gemini API key",
              details: errorMessage,
              troubleshooting: {
                message: "Your API key is invalid. Please get a new one:",
                steps: [
                  "1. Go to https://aistudio.google.com/",
                  "2. Sign in with your Google account",
                  "3. Click 'Get API key' or 'Create API key'",
                  "4. Copy the new API key",
                  "5. Update your .env.local file: GEMINI_API_KEY=your_new_key_here",
                  "6. Restart your dev server",
                  "7. Make sure there are no extra spaces or quotes around the key",
                ],
              },
            },
            { status: 401 }
          );
        }
      }
    } catch (e) {
      // Continue anyway - might be network issue
      console.warn("API key validation failed:", e.message);
    }

    // Use Gemini API for image analysis
    // Free tier: 60 requests per minute
    // First, try to get list of available models
    let availableModels = [];
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
      const listRes = await fetch(listUrl);
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.models) {
          // Filter models that support generateContent
          availableModels = listData.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => m.name.replace('models/', ''))
            .filter(m => m.includes('gemini') && (m.includes('flash') || m.includes('pro')));
        }
      }
    } catch (e) {
      console.warn("Could not fetch available models:", e.message);
    }

    // Use Gemini API for image analysis
    // Try v1beta API (recommended for image analysis)
    const apiVersions = ['v1beta'];
    // Try available models first, then fallback to common names
    const models = availableModels.length > 0 
      ? availableModels 
      : [
          'gemini-2.5-flash',
          'gemini-1.5-flash-latest',
          'gemini-1.5-pro-latest', 
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-pro',
        ];
    let lastError = null;
    
    const prompt = `Analyze this image comprehensively. Provide a detailed analysis in JSON format:

{
  "description": "A clear, concise 2-3 sentence summary of what you see in the image",
  "isAI": true or false (determine if image is AI-generated),
  "aiConfidence": 0.0-1.0 (confidence score for AI/real detection),
  "keyElements": ["element1", "element2", "element3"] (main objects/features),
  "fullAnalysis": "COMPLETE DETAILED ANALYSIS - Write a comprehensive, readable paragraph describing:
    - Everything visible in the image in detail
    - Objects, people, text, and notable features
    - Content type (photo, illustration, graphic, etc.)
    - Lighting, composition, colors, and artistic elements
    - Context and setting
    - Quality and characteristics
    - Any notable aspects or concerns
    Write this as natural, readable text (not JSON), be very thorough and descriptive."
}

For AI detection, look for:
- Unnatural patterns, artifacts, or inconsistencies
- Perfect symmetry or unrealistic details
- Common AI generation signatures
- Texture quality and lighting inconsistencies
- Unusual blending or edge artifacts

Respond ONLY with valid JSON, no markdown code blocks.`;

    // Try each API version and model combination
    for (const apiVersion of apiVersions) {
      for (const model of models) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Gemini API error: ${response.status}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText.substring(0, 200);
          }

          lastError = {
            model: `${apiVersion}/${model}`,
            status: response.status,
            message: errorMessage,
          };
          
          // If it's a 404 (model not found), try next model/version
          if (response.status === 404 || response.status === 400) {
            continue;
          }
          
          // For rate limiting, wait a bit and try next
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          // For other errors, try next combination
          continue;
        }

        const data = await response.json();

        // Extract the analysis text from Gemini response
        let analysisText = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const parts = data.candidates[0].content.parts;
          if (parts && parts[0] && parts[0].text) {
            analysisText = parts[0].text;
          }
        }

        if (!analysisText) {
          lastError = {
            model: `${apiVersion}/${model}`,
            message: "No analysis text in response",
          };
          continue; // Try next model/version
        }

        // Parse JSON response
        let parsedAnalysis = null;
        try {
          // Clean the text - remove markdown code blocks if present
          let cleanText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          // Remove any leading/trailing whitespace or newlines
          cleanText = cleanText.trim();
          parsedAnalysis = JSON.parse(cleanText);
        } catch (e) {
          console.warn("Failed to parse Gemini JSON response:", e.message);
          // If JSON parsing fails, try to extract readable content
          // Look for JSON-like structure in the text
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedAnalysis = JSON.parse(jsonMatch[0]);
            } catch {
              // Final fallback
              parsedAnalysis = {
                description: analysisText.substring(0, 300),
                isAI: null,
                aiConfidence: null,
                keyElements: [],
                fullAnalysis: analysisText
              };
            }
          } else {
            // No JSON found, use text as description
            parsedAnalysis = {
              description: analysisText.substring(0, 300),
              isAI: null,
              aiConfidence: null,
              keyElements: [],
              fullAnalysis: analysisText
            };
          }
        }

        // Success! Return the analysis with clean, readable text
        const analysis = {
          description: parsedAnalysis.description ? String(parsedAnalysis.description).trim() : "",
          isAI: parsedAnalysis.isAI !== undefined ? parsedAnalysis.isAI : null,
          aiConfidence: parsedAnalysis.aiConfidence !== undefined && parsedAnalysis.aiConfidence !== null 
            ? Number(parsedAnalysis.aiConfidence) 
            : null,
          keyElements: Array.isArray(parsedAnalysis.keyElements) ? parsedAnalysis.keyElements : [],
          fullAnalysis: parsedAnalysis.fullAnalysis 
            ? String(parsedAnalysis.fullAnalysis).trim() 
            : (parsedAnalysis.description ? String(parsedAnalysis.description).trim() : analysisText),
          rawText: analysisText, // Complete raw response for reference
          model: `${apiVersion}/${model}`,
          timestamp: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          data: analysis,
        });
      } catch (error) {
        lastError = {
          model: `${apiVersion}/${model}`,
          message: error.message,
        };
        continue; // Try next model/version
      }
    }
    }

    // If we get here, all models failed
    return NextResponse.json(
      {
        error: "All Gemini models failed",
        details: lastError ? `Last error from ${lastError.model}: ${lastError.message}` : "Unknown error",
        troubleshooting: {
          message: "To fix this issue:",
          steps: [
            "1. Get a free API key from https://aistudio.google.com/",
            "2. Make sure your API key is set in .env.local as: GEMINI_API_KEY=your_key_here",
            "3. Restart your dev server after updating .env.local",
            "4. Check if you've exceeded the free tier limit (60 requests/minute)",
            "5. Verify the image format is supported (JPEG, PNG, WebP, GIF)",
            "6. Check your internet connection",
          ],
        },
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process image with Gemini API",
        details: error.message,
        troubleshooting: {
          message: "Check the following:",
          steps: [
            "1. Verify your GEMINI_API_KEY is set correctly in .env.local",
            "2. Check your internet connection",
            "3. Ensure the image file is valid and not corrupted",
            "4. Try again in a moment if rate limited",
          ],
        },
      },
      { status: 500 }
    );
  }
}
