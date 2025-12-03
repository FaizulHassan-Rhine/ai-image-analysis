"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Tag, Code, BookOpen, CheckCircle2, 
  AlertCircle, FileText, Key, Globe, Zap
} from "lucide-react";

export default function APIsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <BookOpen className="h-10 w-10 text-primary" />
            API Documentation
          </h1>
          <p className="text-muted-foreground text-lg">
            Comprehensive documentation for all AI detection APIs used in this application
          </p>
        </div>

        <Tabs defaultValue="sightengine" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sightengine" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sightengine
            </TabsTrigger>
            <TabsTrigger value="clarifai" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Clarifai
            </TabsTrigger>
          </TabsList>

          {/* Sightengine API Documentation */}
          <TabsContent value="sightengine" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-green-600" />
                    <CardTitle>Sightengine API</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-green-50">Content Moderation</Badge>
                </div>
                <CardDescription>
                  AI detection and content moderation with high accuracy for images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Setup & Authentication
                  </h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm"><strong>1. Get Credentials:</strong></p>
                    <p className="text-sm text-muted-foreground">
                      Sign up at <a href="https://sightengine.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sightengine</a> to get your user ID and secret
                    </p>
                    <p className="text-sm mt-3"><strong>2. Add to Environment:</strong></p>
                    <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`SIGHTENGINE_USER=your_user_id
SIGHTENGINE_SECRET=your_secret_key`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    API Endpoint
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-mono mb-2">POST /api/sightengine</p>
                    <p className="text-sm text-muted-foreground">
                      Accepts multipart/form-data with an image file
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Response Format
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`{
  "model": "sightengine",
  "data": {
    "isAI": true,
    "aiConfidence": 0.99,
    "description": "This image is likely AI-generated...",
    "type": {
      "ai_generated": 0.99
    },
    "nudity": {
      "raw": 0.01,
      "partial": 0.02,
      "safe": 0.97
    },
    "offensive": {
      "prob": 0.05
    }
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Features
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>AI Detection:</strong> High-accuracy detection of AI-generated images (0.0-1.0 score)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Content Safety:</strong> Nudity detection (raw, partial, safe)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Offensive Content:</strong> Detection of offensive or inappropriate content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Face Detection:</strong> Face detection and attributes analysis</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clarifai API Documentation */}
          <TabsContent value="clarifai" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="h-6 w-6 text-purple-600" />
                    <CardTitle>Clarifai API</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-purple-50">Image Recognition</Badge>
                </div>
                <CardDescription>
                  Advanced image recognition and concept detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Setup & Authentication
                  </h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm"><strong>1. Get API Key:</strong></p>
                    <p className="text-sm text-muted-foreground">
                      Sign up at <a href="https://www.clarifai.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clarifai</a> to get your API key
                    </p>
                    <p className="text-sm mt-3"><strong>2. Add to Environment:</strong></p>
                    <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`CLARIFAI_API_KEY=your_api_key
CLARIFAI_USER_ID=clarifai  # Optional, defaults to "clarifai"
CLARIFAI_APP_ID=main        # Optional, defaults to "main"`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    API Endpoint
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-mono mb-2">POST /api/clarifai</p>
                    <p className="text-sm text-muted-foreground">
                      Accepts multipart/form-data with an image file
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Response Format
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "outputs": [{
      "data": {
        "concepts": [
          {
            "name": "person",
            "value": 0.98
          },
          {
            "name": "outdoor",
            "value": 0.87
          }
        ]
      }
    }]
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Features
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>General image recognition</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Concept detection with confidence scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Object and scene identification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Top concepts with probability scores</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Usage Example */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Usage Example
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
{`// JavaScript/TypeScript Example
const formData = new FormData();
formData.append('file', imageFile);

// Sightengine API - AI Detection & Content Safety
const sightengineResponse = await fetch('/api/sightengine', {
  method: 'POST',
  body: formData
});
const sightengineData = await sightengineResponse.json();

// Clarifai API - Image Recognition
const clarifaiResponse = await fetch('/api/clarifai', {
  method: 'POST',
  body: formData
});
const clarifaiData = await clarifaiResponse.json();

console.log('AI Detection:', sightengineData);
console.log('Image Recognition:', clarifaiData);`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Error Handling */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Handling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Common Error Responses</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
{`{
  "error": "Error message",
  "details": "Detailed error information",
  "troubleshooting": {
    "message": "Helpful message",
    "steps": [
      "Step 1",
      "Step 2"
    ]
  }
}`}
                  </pre>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">Important:</p>
                  <p className="text-muted-foreground">
                    Always check the response status and handle errors gracefully. 
                    API keys should be kept secure and never exposed in client-side code.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

