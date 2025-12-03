"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Upload, AlertCircle, CheckCircle2, Shield, Eye, Tag, XCircle, 
  Image as ImageIcon, Link as LinkIcon, Sparkles, Zap, Globe, Lock, 
  FileText, TrendingUp, Clock, BarChart3
} from "lucide-react";

export default function DetectPage() {
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    await analyzeImage(formData);
  };

  const handleUrl = async () => {
    if (!imageUrl.trim()) {
      alert('Please enter an image URL');
      return;
    }

    try {
      // Fetch image from URL and convert to blob
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      setPreview(imageUrl);
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      await analyzeImage(formData);
    } catch (error) {
      alert('Failed to load image from URL. Please check the URL and try again.');
    }
  };

  const analyzeImage = async (formData) => {
    try {
      const [gm, se, cf] = await Promise.all([
        fetch("/api/gemini", { method: "POST", body: formData }),
        fetch("/api/sightengine", { method: "POST", body: formData }),
        fetch("/api/clarifai", { method: "POST", body: formData }),
      ]);

      const parseResponse = async (response, name) => {
        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            return { error: errorJson.error || `Error from ${name}`, details: errorJson };
          } catch {
            return { error: `${name} API error: ${response.status}`, details: errorText };
          }
        }
        try {
          return await response.json();
        } catch (error) {
          return { error: `Failed to parse ${name} response`, details: error.message };
        }
      };

      const gmData = await parseResponse(gm, "Gemini");
      const seData = await parseResponse(se, "Sightengine");
      const cfData = await parseResponse(cf, "Clarifai");

      setResult({ gemini: gmData, sightengine: seData, clarifai: cfData });
    } catch (error) {
      setResult({
        error: "Failed to process image",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const renderGeminiResults = (data) => {
    if (!data || data.error) return null;
    const gmData = data.data || data;
    const analysis = gmData.fullAnalysis || gmData.analysis || "";

    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Gemini AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm text-foreground bg-white p-4 rounded-lg border">
              {analysis}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSightengineResults = (data) => {
    if (!data || data.error) return null;
    const seData = data.data || data;
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Content Safety Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {seData.nudity && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Safety Metrics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-white">
                  <span className="text-sm">Safe Content</span>
                  <Badge variant={seData.nudity.safe > 0.9 ? "default" : "secondary"}>
                    {formatPercent(seData.nudity.safe)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-white">
                  <span className="text-sm">Raw Nudity</span>
                  <Badge variant={seData.nudity.raw > 0.1 ? "destructive" : "secondary"}>
                    {formatPercent(seData.nudity.raw)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-white">
                  <span className="text-sm">Partial Nudity</span>
                  <Badge variant={seData.nudity.partial > 0.1 ? "destructive" : "secondary"}>
                    {formatPercent(seData.nudity.partial)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {seData.offensive && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Offensive Content
              </h4>
              <div className="flex justify-between items-center p-2 rounded bg-white">
                <span className="text-sm">Offensive Probability</span>
                <Badge variant={seData.offensive.prob > 0.1 ? "destructive" : "secondary"}>
                  {formatPercent(seData.offensive.prob)}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderClarifaiResults = (data) => {
    if (!data || data.error) return null;
    const cfData = data.data || data;
    const concepts = cfData.outputs?.[0]?.data?.concepts || [];

    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600" />
            Image Recognition
          </CardTitle>
        </CardHeader>
        <CardContent>
          {concepts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Top {Math.min(10, concepts.length)} detected concepts:
              </p>
              <div className="space-y-2">
                {concepts.slice(0, 10).map((concept, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-white">
                    <span className="text-sm font-medium">{concept.name}</span>
                    <Badge variant={concept.value > 0.5 ? "default" : "secondary"}>
                      {formatPercent(concept.value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No concepts detected</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Main Content Area */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Side - Image Display */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Image Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No image selected</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Upload Area */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Image
                </CardTitle>
                <CardDescription>
                  Upload an image from your device or paste an image URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Paste Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={urlInputRef}
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrl()}
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      disabled={loading}
                    />
                    <Button onClick={handleUrl} disabled={loading || !imageUrl.trim()}>
                      Load
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Drag and Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                    disabled={loading}
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Drag and drop an image here
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">or</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    variant="outline"
                  >
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loading Animation */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 justify-center">
                    <Zap className="h-5 w-5 text-primary animate-pulse" />
                    Analyzing Image...
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Processing with multiple AI models
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && !loading && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Analysis Results</h2>
            </div>
            <div className="grid gap-4">
              {result.gemini && renderGeminiResults(result.gemini)}
              {result.sightengine && renderSightengineResults(result.sightengine)}
              {result.clarifai && renderClarifaiResults(result.clarifai)}
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Upload Image</h3>
                <p className="text-sm text-muted-foreground">
                  Upload an image from your device or paste an image URL
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI models analyze the image using multiple detection APIs
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. Get Results</h3>
                <p className="text-sm text-muted-foreground">
                  Receive detailed analysis and insights about your image
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Why Choose It Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Why Choose Our AI Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple AI Models</h3>
                  <p className="text-sm text-muted-foreground">
                    We use Google Gemini, Sightengine, and Clarifai for comprehensive analysis
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Fast Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Get results in seconds with our optimized AI pipeline
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Privacy Focused</h3>
                  <p className="text-sm text-muted-foreground">
                    Your images are processed securely and not stored permanently
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Accurate Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced AI models provide detailed and accurate image analysis
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
