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
    
    // Include all available models for comprehensive analysis
    // Models should be in query string (Sightengine standard)
    const models = 'nudity-2.1,weapon,alcohol,recreational_drug,medical,properties,type,quality,offensive-2.0,faces,people-counting,text-content,face-age,gore-2.0,text,qr-content,tobacco,genai,violence,self-harm,money,gambling';
    
    const url = `https://api.sightengine.com/1.0/check.json?models=${encodeURIComponent(models)}&api_user=${process.env.SIGHTENGINE_USER}&api_secret=${process.env.SIGHTENGINE_SECRET}`;

    const result = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error('Sightengine API Error:', result.status, errorText);
      return NextResponse.json(
        { error: `Sightengine API error: ${result.status}`, details: errorText },
        { status: result.status }
      );
    }

    const data = await result.json();
    
    // Check if API returned an error in the response body
    if (data.error || data.message) {
      console.error('Sightengine API Error in response:', data.error || data.message);
      return NextResponse.json(
        { error: data.error || data.message || "Sightengine API returned an error", details: data },
        { status: 400 }
      );
    }
    
    // Log response for debugging
    console.log('=== Sightengine API Response Debug ===');
    console.log('Full Response:', JSON.stringify(data, null, 2));
    console.log('Top-level keys:', Object.keys(data));
    
    // Sightengine API: When using 'nudity-2.1' model, response uses 'nudity' key (not 'nudity-2.1')
    // When using 'offensive-2.0' model, response uses 'offensive' key (not 'offensive-2.0')
    // The model version in request doesn't change the response key - it's always 'nudity' and 'offensive'
    let nudityData = data.nudity;
    let offensiveData = data.offensive;
    
    // Log what we found
    console.log('Direct access - data.nudity:', data.nudity);
    console.log('Direct access - data.offensive:', data.offensive);
    
    // If nudity is undefined, check for alternative keys (shouldn't happen but just in case)
    if (nudityData === undefined) {
      const altNudity = data['nudity-2.1'] || data['nudity_2_1'];
      if (altNudity) {
        nudityData = altNudity;
        console.log('Found nudity under alternative key');
      }
    }
    
    if (offensiveData === undefined) {
      const altOffensive = data['offensive-2.0'] || data['offensive_2_0'];
      if (altOffensive) {
        offensiveData = altOffensive;
        console.log('Found offensive under alternative key');
      }
    }
    
    // Ensure we have objects (not null/undefined)
    nudityData = nudityData || {};
    offensiveData = offensiveData || {};
    
    console.log('Final nudityData:', nudityData);
    console.log('Final offensiveData:', offensiveData);
    console.log('Nudity keys:', Object.keys(nudityData));
    console.log('Offensive keys:', Object.keys(offensiveData));
    console.log('Nudity raw value:', nudityData.raw, typeof nudityData.raw);
    console.log('Nudity partial value:', nudityData.partial, typeof nudityData.partial);
    console.log('Nudity safe value:', nudityData.safe, typeof nudityData.safe);
    console.log('Offensive prob value:', offensiveData.prob, typeof offensiveData.prob);
    
    const aiGeneratedScore = data.type?.ai_generated ?? null;
    
    // Sightengine returns 0.0-1.0 where higher = more likely AI-generated
    // Using a threshold of 0.3 for better sensitivity
    // If score is 0.85, that means 85% likely AI, so isAI should be true
    const isAI = aiGeneratedScore !== null ? aiGeneratedScore > 0.3 : null;
    
    // For confidence display, use the ai_generated score directly (0.0-1.0)
    // Higher score = more confident it's AI
    const confidenceForDisplay = aiGeneratedScore !== null ? aiGeneratedScore : 0;
    
    // Extract nudity values - nudity-2.1 model uses different structure
    // Structure: sexual_activity, sexual_display, erotica, very_suggestive, suggestive, mildly_suggestive, none
    // Map to our expected format:
    // - safe = none (higher none = safer)
    // - raw = max of sexual_activity, sexual_display, erotica (most explicit)
    // - partial = max of very_suggestive, suggestive, mildly_suggestive (less explicit)
    let safeValue = 0;
    let rawValue = 0;
    let partialValue = 0;
    
    if (nudityData && typeof nudityData === 'object') {
      // Safe content = none value (0.0-1.0, higher = safer)
      safeValue = typeof nudityData.none === 'number' ? nudityData.none : 0;
      
      // Raw nudity = most explicit content (sexual_activity, sexual_display, erotica)
      const explicitValues = [
        nudityData.sexual_activity,
        nudityData.sexual_display,
        nudityData.erotica
      ].filter(v => typeof v === 'number');
      rawValue = explicitValues.length > 0 ? Math.max(...explicitValues) : 0;
      
      // Partial nudity = suggestive content (very_suggestive, suggestive, mildly_suggestive)
      const suggestiveValues = [
        nudityData.very_suggestive,
        nudityData.suggestive,
        nudityData.mildly_suggestive
      ].filter(v => typeof v === 'number');
      partialValue = suggestiveValues.length > 0 ? Math.max(...suggestiveValues) : 0;
    }
    
    // Extract offensive values - offensive-2.0 model uses different structure
    // Structure: nazi, asian_swastika, confederate, supremacist, terrorist, middle_finger
    // Calculate max of all offensive category values
    let offensiveProb = 0;
    
    if (offensiveData && typeof offensiveData === 'object') {
      // Check if it has a direct 'prob' key (older model format)
      if (typeof offensiveData.prob === 'number') {
        offensiveProb = offensiveData.prob;
      } else {
        // New format: get max of all offensive category values
        const offensiveValues = Object.values(offensiveData).filter(v => typeof v === 'number');
        offensiveProb = offensiveValues.length > 0 ? Math.max(...offensiveValues) : 0;
      }
    }
    
    console.log('Extracted values:');
    console.log('  Safe:', safeValue, typeof safeValue);
    console.log('  Raw:', rawValue, typeof rawValue);
    console.log('  Partial:', partialValue, typeof partialValue);
    console.log('  Offensive:', offensiveProb, typeof offensiveProb);
    console.log('=== End Debug ===');
    
    // Add AI detection data in format compatible with frontend
    // Preserve original data and add normalized structure
    const responseData = {
      ...data,
      // Normalize nudity data - ensure it always exists
      nudity: {
        safe: safeValue,
        raw: rawValue,
        partial: partialValue,
      },
      // Normalize offensive data - ensure it always exists
      offensive: {
        prob: offensiveProb,
      },
      // AI Detection fields (for compatibility with Gemini format)
      isAI: isAI,
      aiConfidence: confidenceForDisplay, // Use raw score for confidence
      description: aiGeneratedScore !== null 
        ? `This image is ${isAI ? 'likely AI-generated' : 'likely a real photo'}. AI generation probability: ${(aiGeneratedScore * 100).toFixed(1)}%`
        : 'AI detection analysis completed.',
      keyElements: [],
      fullAnalysis: aiGeneratedScore !== null
        ? `AI Detection Analysis (Sightengine):\n\n` +
          `Status: ${isAI ? 'AI Generated' : 'Real Photo'}\n` +
          `AI Generation Probability: ${(aiGeneratedScore * 100).toFixed(1)}%\n` +
          `Raw Score: ${aiGeneratedScore.toFixed(4)} (0.0 = Real, 1.0 = AI)\n` +
          `Threshold Used: 0.3 (scores above this are considered AI-generated)\n\n` +
          `The Sightengine AI detection model has analyzed this image and determined that it is ${isAI ? 'likely generated by artificial intelligence' : 'likely a genuine photograph'} with an AI generation probability of ${(aiGeneratedScore * 100).toFixed(1)}%. ` +
          `${isAI ? 'AI-generated images typically show certain patterns, artifacts, or characteristics that distinguish them from real photographs.' : 'Real photographs typically show natural variations, realistic lighting, and authentic details that are characteristic of genuine photography.'}`
        : 'AI detection analysis was completed, but no score was available. Please ensure the "genai" model is enabled in your Sightengine API request.',
    };
    
    return NextResponse.json({ model: "sightengine", data: responseData });
  } catch (error) {
    console.error("Sightengine API error:", error);
    return NextResponse.json(
      { error: "Failed to process request", message: error.message },
      { status: 500 }
    );
  }
}
