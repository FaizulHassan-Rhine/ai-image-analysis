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

    if (!process.env.HF_API_KEY) {
      return NextResponse.json(
        { error: "HuggingFace API key not configured" },
        { status: 500 }
      );
    }

    // Try to verify API key (non-blocking - some tokens work even if whoami fails)
    let apiKeyValid = null; // null = not checked, true/false = checked
    try {
      const userCheck = await fetch("https://huggingface.co/api/whoami", {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
      });
      apiKeyValid = userCheck.ok;
    } catch {
      // Skip validation - try using the key directly
      apiKeyValid = null;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Test API key with a simple request first
    let apiKeyWorks = false;
    try {
      const testRes = await fetch("https://huggingface.co/api/models", {
        headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
      });
      apiKeyWorks = testRes.ok;
    } catch {
      // Continue anyway
    }

    // Try models that are known to work with Inference API
    // Using models that explicitly support inference endpoints and are available
    const models = [
      "microsoft/resnet-50",                   // Very common ResNet model
      "google/vit-base-patch16-224",           // Popular Vision Transformer  
      "facebook/deit-base-distilled-patch16-224", // Facebook's DeiT
    ];
    
    // Note: Many models may not be available for free inference
    // The router endpoint format might be different or models need to be explicitly enabled

    let lastError = null;
    let res = null;
    let successfulModel = null;
    let lastResponseText = null;

    // Try each model - use router endpoint (api-inference is deprecated)
    for (const modelName of models) {
      try {
        // Try router endpoint first (new recommended endpoint)
        let url = `https://router.huggingface.co/models/${modelName}`;
        
        // Try binary first
        res = await fetch(url, {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
          },
          body: buffer,
        });

        lastResponseText = await res.text().catch(() => "Could not read response");
        
        // If binary fails, try JSON with base64
        if (!res.ok && res.status !== 503) {
          try {
            res = await fetch(url, {
              method: "POST",
              headers: { 
                Authorization: `Bearer ${process.env.HF_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ inputs: base64 }),
            });
            lastResponseText = await res.text().catch(() => "Could not read response");
          } catch (e) {
            // Continue with original response
          }
        }
        
        // If router returns 404/410 or HTML, try inference API as fallback
        if (res.status === 404 || res.status === 410 || lastResponseText.trim().startsWith('<!doctype') || lastResponseText.trim().startsWith('<!DOCTYPE')) {
          // Try inference API as fallback (some models still work there)
          url = `https://api-inference.huggingface.co/models/${modelName}`;
          res = await fetch(url, {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${process.env.HF_API_KEY}`,
            },
            body: buffer,
          });
          lastResponseText = await res.text().catch(() => "Could not read response");
          
          // Check if we got HTML error page from inference API too
          if (lastResponseText.trim().startsWith('<!doctype') || lastResponseText.trim().startsWith('<!DOCTYPE')) {
            // Extract JSON error if present
            const jsonMatch = lastResponseText.match(/\{"error":\s*"[^"]+"\}/);
            if (jsonMatch) {
              try {
                const errorJson = JSON.parse(jsonMatch[0]);
                lastError = {
                  status: res.status || 410,
                  text: errorJson.error,
                };
              } catch {}
            }
            continue; // Try next model
          }
          
          // If inference API also fails, log for debugging
          if (!res.ok && res.status !== 503) {
            console.log(`Model ${modelName} failed on both endpoints: ${res.status} - ${lastResponseText.substring(0, 100)}`);
          }
        }
        
        // Check if we got an HTML response (error page) - extract JSON error if present
        if (lastResponseText.trim().startsWith('<!doctype') || lastResponseText.trim().startsWith('<!DOCTYPE')) {
          // Try to extract JSON error from HTML
          const jsonMatch = lastResponseText.match(/\{"error":\s*"[^"]+"\}/);
          if (jsonMatch) {
            try {
              const errorJson = JSON.parse(jsonMatch[0]);
              lastError = {
                status: res.status || 410,
                text: errorJson.error,
              };
            } catch {}
          } else {
            lastError = {
              status: res.status || 410,
              text: "Received HTML error page - endpoint may be deprecated",
            };
          }
          continue; // Skip to next model
        }

        // Check if response is OK
        if (res.ok) {
          try {
            const data = JSON.parse(lastResponseText);
            if (data && (Array.isArray(data) || typeof data === 'object')) {
              successfulModel = modelName;
              break;
            }
          } catch (parseError) {
            // Not valid JSON, try next format
          }
        }

        // If 503 (model loading), wait and retry
        if (res.status === 503) {
          const retryAfter = res.headers.get("retry-after");
          const waitTime = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 30000) : 15000;
          
          console.log(`Model ${modelName} is loading, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Retry with router endpoint
          res = await fetch(`https://router.huggingface.co/models/${modelName}`, {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${process.env.HF_API_KEY}`,
            },
            body: buffer,
          });

          lastResponseText = await res.text().catch(() => "Could not read response");
          
          if (res.ok) {
            try {
              const data = JSON.parse(lastResponseText);
              if (data && (Array.isArray(data) || typeof data === 'object')) {
                successfulModel = modelName;
                break;
              }
            } catch {
              // Continue
            }
          }
        }

        // If 401/403, might need to accept model terms
        if (res.status === 401 || res.status === 403) {
          lastError = {
            status: res.status,
            text: `Authentication issue. Please visit https://huggingface.co/${modelName} and accept the model terms if required.`,
          };
          continue;
        }

        // Save error for reporting
        if (!res.ok && res.status !== 503) {
          try {
            const errorJson = JSON.parse(lastResponseText);
            lastError = {
              status: res.status,
              text: errorJson.error || errorJson.message || lastResponseText.substring(0, 200),
            };
          } catch {
            lastError = {
              status: res.status,
              text: lastResponseText.substring(0, 200),
            };
          }
        }
      } catch (error) {
        lastError = { 
          error: error.message,
          status: 0,
        };
        console.error(`Error with model ${modelName}:`, error.message);
        continue;
      }
    }

    // If binary didn't work, try base64 JSON format with router
    if (!successfulModel) {
      for (const modelName of models.slice(0, 3)) { // Try top 3 with base64
        try {
          const url = `https://router.huggingface.co/models/${modelName}`;
          
          res = await fetch(url, {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${process.env.HF_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: base64 }),
          });

          lastResponseText = await res.text().catch(() => "Could not read response");
          
          if (res.ok) {
            try {
              const data = JSON.parse(lastResponseText);
              if (data && (Array.isArray(data) || typeof data === 'object')) {
                successfulModel = modelName;
                break;
              }
            } catch {
              // Continue
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    if (!successfulModel) {
      // Return error but with helpful message
      return NextResponse.json(
        { 
          error: "HuggingFace API: All models unavailable",
          details: lastError?.text || lastError?.error || "All models tried are currently unavailable or not accessible.",
            troubleshooting: {
            message: "HuggingFace Inference API may not be available for these models. Try the following:",
            steps: [
              "1. Verify your API token starts with 'hf_' and is copied correctly (no extra spaces)",
              "2. Go to https://huggingface.co/settings/tokens and ensure 'Make calls to Inference Providers' is enabled",
              "3. Check if models support inference: Visit https://huggingface.co/microsoft/resnet-50 and look for 'Inference API' section",
              "4. Some models may require accepting terms - visit the model page and click 'Agree and access repository'",
              "5. The free Inference API may have limited availability - check https://status.huggingface.co/",
              "6. Try using HuggingFace Spaces or local inference as alternatives",
              "7. Make sure your .env.local has: HF_API_KEY=hf_your_token_here (no quotes)",
              "8. Restart your dev server after updating .env.local",
            ],
            modelsTried: models,
            apiKeyValid: apiKeyValid,
            apiKeyWorks: apiKeyWorks,
            note: apiKeyWorks === false ? "API key test failed - token may be invalid" : (apiKeyValid === false ? "API key validation failed, but trying anyway..." : "Note: Free Inference API may have limited model availability. Router endpoint returned 404, Inference API returned 410 (deprecated)."),
          },
          debug: process.env.NODE_ENV === 'development' ? {
            lastStatus: lastError?.status,
            lastError: lastError?.text,
            lastResponse: lastResponseText?.substring(0, 500),
            modelsTried: models.length,
          } : undefined,
        },
        { status: 503 }
      );
    }

    try {
      const data = JSON.parse(lastResponseText);
      return NextResponse.json({ 
        model: "huggingface", 
        modelName: successfulModel,
        data 
      });
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: "Failed to parse HuggingFace response", 
          details: parseError.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("HuggingFace API error:", error);
    return NextResponse.json(
      { error: "Failed to process request", message: error.message },
      { status: 500 }
    );
  }
}
