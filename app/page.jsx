"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Loader2, Upload, AlertCircle, CheckCircle2, Shield, Eye, Tag, XCircle, 
  Image as ImageIcon, Link as LinkIcon, Sparkles, Zap, Globe, Lock, 
  FileText, TrendingUp, Clock, BarChart3, ExternalLink
} from "lucide-react";

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export default function HomePage() {
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fullReportOpen, setFullReportOpen] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState(null);
  const [selectedAPIs, setSelectedAPIs] = useState({
    gemini: false,
    sightengine: false,
    clarifai: false,
  });
  const fileInputRef = useRef(null);
  const urlInputRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const validateFile = (file) => {
    setFileError(null);
    
    if (!file) {
      setFileError('No file selected');
      return false;
    }

    // Check file type
    if (!ALLOWED_FORMATS.includes(file.type.toLowerCase())) {
      setFileError(`Unsupported file format. Please use: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileError(`File too large. Maximum size: ${maxSizeMB}MB. Your file: ${fileSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file) => {
    if (!validateFile(file)) {
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setLoading(false);
    setResult(null);
    setFileError(null);
    // Reset checkboxes when new image is uploaded
    setSelectedAPIs({
      gemini: false,
      sightengine: false,
      clarifai: false,
    });
    // Don't analyze yet - wait for user to select APIs
  };

  const handleUrl = async () => {
    if (!imageUrl.trim()) {
      setFileError('Please enter an image URL');
      return;
    }

    setFileError(null);

    try {
      // Fetch image from URL and convert to blob
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // Validate blob type
      if (!blob.type || !ALLOWED_FORMATS.includes(blob.type.toLowerCase())) {
        setFileError(`Unsupported image format from URL. Please use: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      // Validate blob size
      if (blob.size > MAX_FILE_SIZE) {
        const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        setFileError(`Image too large. Maximum size: ${maxSizeMB}MB. Image size: ${fileSizeMB}MB`);
        return;
      }

      const file = new File([blob], 'image.jpg', { type: blob.type });
      
      setImageFile(file);
      setPreview(imageUrl);
      setLoading(false);
      setResult(null);
      setFileError(null);
      // Reset checkboxes when new image is loaded from URL
      setSelectedAPIs({
        gemini: false,
        sightengine: false,
        clarifai: false,
      });
      // Don't analyze yet - wait for user to select APIs
    } catch (error) {
      setFileError('Failed to load image from URL. Please check the URL and try again.');
    }
  };

  const analyzeImage = async () => {
    // Check if at least one API is selected (only Sightengine and Clarifai available in UI)
    if (!selectedAPIs.sightengine && !selectedAPIs.clarifai) {
      alert('Kindly check any option to proceed with analysis');
      return;
    }

    if (!imageFile) {
      alert('No image file available');
      return;
    }

    setLoading(true);
    setResult(null);
    setAnalysisTime(0);
    setProgress(0);

    // Start timer
    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setAnalysisTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    // Initial progress - show that we've started
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      // Count selected APIs (only Sightengine and Clarifai available in UI)
      const totalAPIs = (selectedAPIs.sightengine ? 1 : 0) + 
                       (selectedAPIs.clarifai ? 1 : 0);
      
      // Only call selected APIs with progress tracking
      const progressIncrement = 90 / totalAPIs; // 90% for APIs, 10% for initial
      setProgress(10);

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

      // Create promises with progress tracking
      const apiPromises = [];
      if (selectedAPIs.sightengine) {
        apiPromises.push(
          fetch("/api/sightengine", { method: "POST", body: formData })
            .then(async (response) => {
              setProgress(prev => Math.min(prev + progressIncrement, 90));
              const data = await parseResponse(response, "Sightengine");
              setProgress(prev => Math.min(prev + progressIncrement, 90));
              return { key: 'sightengine', data };
            })
        );
      }
      if (selectedAPIs.clarifai) {
        apiPromises.push(
          fetch("/api/clarifai", { method: "POST", body: formData })
            .then(async (response) => {
              setProgress(prev => Math.min(prev + progressIncrement, 90));
              const data = await parseResponse(response, "Clarifai");
              setProgress(prev => Math.min(prev + progressIncrement, 90));
              return { key: 'clarifai', data };
            })
        );
      }

      // Wait for all APIs to complete
      const apiResults = await Promise.all(apiPromises);
      
      // Organize results
      const results = {};
      apiResults.forEach(({ key, data }) => {
        results[key] = data;
      });

      setResult(results);
      setProgress(100);
    } catch (error) {
      setResult({
        error: "Failed to process image",
        message: error.message,
      });
    } finally {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const allSelected = selectedAPIs.sightengine && selectedAPIs.clarifai;
    setSelectedAPIs({
      gemini: false, // Keep Gemini disabled in UI
      sightengine: !allSelected,
      clarifai: !allSelected,
    });
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

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
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const renderGeminiResults = (data) => {
    if (!data || data.error) return null;
    const gmData = data.data || data;
    
    // Extract description - handle both string and JSON cases
    let description = "";
    if (typeof gmData.description === 'string') {
      description = gmData.description;
    } else if (gmData.description) {
      description = String(gmData.description);
    }
    
    // Clean description if it contains JSON
    if (description.includes('{') && description.includes('"')) {
      try {
        const parsed = JSON.parse(description);
        description = parsed.description || parsed.fullAnalysis || description;
      } catch {
        // If parsing fails, try to extract readable text
        const match = description.match(/"description":\s*"([^"]+)"/);
        if (match) description = match[1];
      }
    }
    
    const isAI = gmData.isAI;
    const aiConfidence = gmData.aiConfidence;
    const keyElements = gmData.keyElements || [];
    
    // Get full analysis - prefer fullAnalysis field, fallback to rawText
    let fullAnalysis = gmData.fullAnalysis || gmData.rawText || "";
    
    // Clean full analysis - remove JSON formatting if present
    if (fullAnalysis.includes('{') && fullAnalysis.includes('"description"')) {
      try {
        const parsed = JSON.parse(fullAnalysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        // Format as readable text
        fullAnalysis = parsed.fullAnalysis || 
          `Description: ${parsed.description || 'N/A'}\n\n` +
          `Image Type: ${parsed.isAI ? 'AI Generated' : 'Real Photo'}\n` +
          `Confidence: ${parsed.aiConfidence ? formatPercent(parsed.aiConfidence) : 'N/A'}\n\n` +
          `Key Elements: ${parsed.keyElements ? parsed.keyElements.join(', ') : 'N/A'}\n\n` +
          (parsed.fullAnalysis || '');
      } catch {
        // If it's a JSON string, try to extract readable parts
        const jsonMatch = fullAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            fullAnalysis = parsed.fullAnalysis || parsed.description || fullAnalysis;
          } catch {}
        }
      }
    }

    return (
      <Card className="border border-gray-200 bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
            <div className="p-1.5 rounded bg-gray-200">
              <Sparkles className="h-4 w-4 text-gray-700" />
            </div>
            Gemini AI Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI/Real Detection */}
          {isAI !== null && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Image Type</span>
                <Badge 
                  className={`text-xs px-3 py-1 font-semibold ${
                    isAI 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {isAI ? "🤖 AI Generated" : "📷 Real Photo"}
                </Badge>
              </div>
              {aiConfidence !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span>Confidence</span>
                    <span className="font-medium">{formatPercent(aiConfidence)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        isAI ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{ width: `${aiConfidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {description && description.trim() && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {description.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')}
              </p>
            </div>
          )}

          {/* Key Elements */}
          {keyElements.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Elements</h4>
              <div className="flex flex-wrap gap-2">
                {keyElements.map((element, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                    {element}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Full Report Link */}
          {fullAnalysis && (
            <div className="pt-2 border-t border-gray-200">
              <Dialog open={fullReportOpen} onOpenChange={setFullReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-300">
                    <FileText className="h-4 w-4 mr-2" />
                    Read Full Analysis Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <Sparkles className="h-5 w-5 text-gray-700" />
                      Complete Gemini AI Analysis Report
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600">
                      Comprehensive detailed analysis of your image
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto mt-4 pr-2">
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="prose prose-sm max-w-none">
                        <div className="text-sm text-gray-700 font-sans leading-relaxed space-y-4">
                          {fullAnalysis.split('\n').map((line, idx) => {
                            // Format headings
                            if (line.match(/^[A-Z][^:]+:$/)) {
                              return (
                                <h3 key={idx} className="font-bold text-gray-900 mt-4 mb-2 text-base">
                                  {line.replace(':', '')}
                                </h3>
                              );
                            }
                            // Format bullet points
                            if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                              return (
                                <div key={idx} className="ml-4 flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>{line.replace(/^[-•]\s*/, '')}</span>
                                </div>
                              );
                            }
                            // Regular paragraphs
                            if (line.trim()) {
                              return (
                                <p key={idx} className="mb-2">
                                  {line}
                                </p>
                              );
                            }
                            return <br key={idx} />;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSightengineResults = (data) => {
    if (!data || data.error) return null;
    const seData = data.data || data;
    
    // Extract AI detection data
    const isAI = seData.isAI;
    const aiConfidence = seData.aiConfidence;
    const description = seData.description || '';
    const fullAnalysis = seData.fullAnalysis || '';
    
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Detection Section */}
        {isAI !== null && (
          <Card className="border border-gray-200 bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <div className="p-1.5 rounded bg-gray-200">
                  <Sparkles className="h-4 w-4 text-gray-700" />
                </div>
                Sightengine AI Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-700">Detection Result</span>
                  <Badge 
                    className={`font-semibold text-xs ${
                      isAI 
                        ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                        : 'bg-green-500 text-white border-green-600 hover:bg-green-600'
                    }`}
                  >
                    {isAI ? 'AI Generated' : 'Real Photo'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600">Confidence</span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatPercent(aiConfidence)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isAI ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(aiConfidence * 100)}%` }}
                      />
                    </div>
                  </div>
                  {description && (
                    <p className="text-sm text-gray-600 mt-3">{description}</p>
                  )}
                  {fullAnalysis && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <FileText className="h-3 w-3 mr-2" />
                          Read Full Analysis Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Complete AI Detection Analysis Report</DialogTitle>
                          <DialogDescription>
                            Detailed analysis from Sightengine AI detection model
                          </DialogDescription>
                        </DialogHeader>
                        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                          {fullAnalysis}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Content Safety Section */}
        <Card className="border border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <div className="p-1.5 rounded bg-gray-200">
                <Shield className="h-4 w-4 text-gray-700" />
              </div>
              Content Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          {seData.nudity && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                <Lock className="h-4 w-4 text-gray-600" />
                Safety Metrics
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-green-50 border border-green-200">
                  <span className="text-sm font-medium text-gray-700">Safe Content</span>
                  <Badge className="font-semibold text-xs bg-green-500 text-white border-green-600 hover:bg-green-600">
                    {formatPercent(seData.nudity.safe)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-sm font-medium text-gray-700">Raw Nudity</span>
                  <Badge className="font-semibold text-xs bg-red-500 text-white border-red-600 hover:bg-red-600">
                    {formatPercent(seData.nudity.raw)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-sm font-medium text-gray-700">Partial Nudity</span>
                  <Badge className="font-semibold text-xs bg-red-500 text-white border-red-600 hover:bg-red-600">
                    {formatPercent(seData.nudity.partial)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {seData.offensive && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                Offensive Content
              </h4>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Offensive Probability</span>
                <Badge variant={seData.offensive.prob > 0.1 ? "destructive" : "outline"} className="font-semibold text-xs">
                  {formatPercent(seData.offensive.prob)}
                </Badge>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderClarifaiResults = (data) => {
    if (!data || data.error) return null;
    const cfData = data.data || data;
    const concepts = cfData.outputs?.[0]?.data?.concepts || [];

    return (
      <Card className="border border-gray-200 bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
            <div className="p-1.5 rounded bg-gray-200">
              <Tag className="h-4 w-4 text-gray-700" />
            </div>
            Image Recognition
          </CardTitle>
        </CardHeader>
        <CardContent>
          {concepts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Top {Math.min(10, concepts.length)} Detected Concepts
              </p>
              <div className="grid grid-cols-1 gap-2">
                {concepts.slice(0, 10).map((concept, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center p-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 capitalize">{concept.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-gray-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${concept.value * 100}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="font-semibold text-xs min-w-[3.5rem] justify-end bg-gray-50 text-gray-700 border-gray-300">
                        {formatPercent(concept.value)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-4">No concepts detected</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI Image Detection & Analysis
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Analyze images with advanced AI models to detect AI-generated content, 
            check content safety, and identify objects and concepts
          </p>
        </div>

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
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported: JPG, PNG, WebP, GIF • Max: 10MB
                  </p>
                  {fileError && !preview && imageUrl && (
                    <Alert className="mt-3 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {fileError}
                      </AlertDescription>
                    </Alert>
                  )}
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
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        handleFile(file);
                      }
                    }}
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
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-muted-foreground">
                      <strong>Supported formats:</strong> JPG, PNG, WebP, GIF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Maximum file size:</strong> 10MB
                    </p>
                  </div>
                  {fileError && !preview && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {fileError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API Selection - Show after image is uploaded */}
        {preview && !loading && !result && (
          <Card className="mb-8 border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Select Analysis Options</CardTitle>
              <CardDescription>
                Choose which AI services to use for analyzing your image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedAPIs.sightengine && selectedAPIs.clarifai}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-semibold text-gray-900 cursor-pointer"
                >
                  Select All
                </label>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="sightengine"
                    checked={selectedAPIs.sightengine}
                    onCheckedChange={(checked) =>
                      setSelectedAPIs({ ...selectedAPIs, sightengine: checked })
                    }
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="sightengine"
                      className="text-sm font-semibold text-gray-900 cursor-pointer block mb-1"
                    >
                      AI Detection & Content Safety
                    </label>
                    <p className="text-xs text-gray-600">
                      Detect if image is AI-generated (high accuracy) and check for nudity/offensive content
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id="clarifai"
                    checked={selectedAPIs.clarifai}
                    onCheckedChange={(checked) =>
                      setSelectedAPIs({ ...selectedAPIs, clarifai: checked })
                    }
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="clarifai"
                      className="text-sm font-semibold text-gray-900 cursor-pointer block mb-1"
                    >
                      Image Recognition
                    </label>
                    <p className="text-xs text-gray-600">
                      Identify objects, scenes, and concepts with confidence scores
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={analyzeImage}
                  className="w-full"
                  size="lg"
                  disabled={!selectedAPIs.sightengine && !selectedAPIs.clarifai}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Animation */}
        {loading && (
          <Card className="mb-8 border border-gray-200 bg-white">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="h-4 w-4 text-gray-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3 w-full max-w-md">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Analyzing Image...
                    </h3>
                    <p className="text-sm text-gray-600">
                      Processing with multiple AI models
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{Math.round(progress)}% Complete</span>
                      <span className="font-medium">{analysisTime}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && !loading && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-gray-200">
                <CheckCircle2 className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Analysis Results
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive AI-powered image analysis
                </p>
              </div>
            </div>
            <div className="space-y-6">
              {result.sightengine && (
                <div>
                  {renderSightengineResults(result.sightengine)}
                </div>
              )}
              {result.clarifai && (
                <div>
                  {renderClarifaiResults(result.clarifai)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3 text-gray-900">How It Works</h2>
            <p className="text-lg text-gray-600">
              Get your image analyzed in three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Step 1 */}
            <Card className="border border-gray-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200">
                  STEP 1
                </Badge>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Upload Your Image</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Upload your image as a file or paste the image URL directly. Our intelligent system automatically processes and analyzes all visual content.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 - Highlighted */}
            <Card className="border-2 border-purple-200 bg-white hover:shadow-lg transition-shadow shadow-md">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-sm">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200">
                  STEP 2
                </Badge>
                <h3 className="text-xl font-bold mb-3 text-gray-900">AI Analysis</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Our AI-powered engine analyzes your image using multiple detection models including Sightengine and Clarifai in real-time.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="border border-gray-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shadow-sm">
                    <BarChart3 className="h-8 w-8 text-pink-600" />
                  </div>
                </div>
                <Badge className="mb-4 bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-200">
                  STEP 3
                </Badge>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Get Detailed Analysis</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Receive comprehensive insights including AI/real detection, content safety metrics, image recognition tags, and actionable recommendations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Choose It Section */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">What Your Analysis Includes</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive insights and actionable intelligence to understand your images better
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">AI/Real Detection</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Advanced detection to determine if your image is AI-generated or a real photograph, 
                  with confidence scoring and detailed analysis.
                </p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Content Safety Analysis</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Professional content moderation with nudity detection, offensive content screening, 
                  and safety metrics to ensure appropriate content.
                </p>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <Tag className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Image Recognition</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Intelligent concept detection identifying objects, scenes, people, and visual elements 
                  with confidence percentages for each detected concept.
                </p>
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Multiple AI Models</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Powered by Google Gemini, Sightengine, and Clarifai working in parallel to provide 
                  the most comprehensive and accurate analysis available.
                </p>
              </CardContent>
            </Card>

            {/* Card 5 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Privacy & Security</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your images are processed securely with enterprise-grade encryption. Images are not 
                  stored permanently and are deleted immediately after analysis.
                </p>
              </CardContent>
            </Card>

            {/* Card 6 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Lightning Fast</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Get comprehensive results in seconds with our optimized AI pipeline. Parallel processing 
                  ensures quick turnaround without compromising accuracy.
                </p>
              </CardContent>
            </Card>

            {/* Card 7 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Detailed Metrics</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Receive comprehensive metrics with confidence scores, probability distributions, and 
                  visual progress indicators for easy interpretation of results.
                </p>
              </CardContent>
            </Card>

            {/* Card 8 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Visual Insights</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Beautiful, intuitive visualizations make it easy to understand your analysis results 
                  at a glance with color-coded indicators and progress bars.
                </p>
              </CardContent>
            </Card>

            {/* Card 9 */}
            <Card className="border border-gray-200 bg-gray-50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">Accurate Results</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  State-of-the-art AI models trained on millions of images provide industry-leading 
                  accuracy for all detection and recognition tasks.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

