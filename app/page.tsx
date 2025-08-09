"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Compass, Anchor, Map, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShipwreckedSketchAI() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    "qwen/qwen2.5-vl-32b-instruct:free"
  );
  const [aiDescription, setAiDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [inkSplatters, setInkSplatters] = useState<
    Array<{ id: number; x: number; y: number; size: number }>
  >([]);

  const { toast } = useToast();

  // Audio context and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  // Drawing state
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState("#8B4513");

  // Initialize microphone and audio analysis
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyzerRef.current = audioContextRef.current.createAnalyser();

      analyzerRef.current.fftSize = 2048;
      source.connect(analyzerRef.current);

      setIsMicActive(true);
      analyzeAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsMicActive(false);
    setCurrentVolume(0);
    setCurrentPitch(0);
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyzerRef.current) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyArray = new Uint8Array(bufferLength);

    analyzerRef.current.getByteTimeDomainData(dataArray);
    analyzerRef.current.getByteFrequencyData(frequencyArray);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sum += sample * sample;
    }
    const volume = Math.sqrt(sum / bufferLength);
    setCurrentVolume(volume);

    // Calculate dominant frequency (pitch)
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < frequencyArray.length; i++) {
      if (frequencyArray[i] > maxValue) {
        maxValue = frequencyArray[i];
        maxIndex = i;
      }
    }
    const pitch =
      (maxIndex * (audioContextRef.current?.sampleRate || 44100)) /
      (2 * bufferLength);
    setCurrentPitch(pitch);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  // Update drawing parameters based on audio
  useEffect(() => {
    if (isMicActive) {
      // Map volume to stroke width (1-20px)
      const newStrokeWidth = Math.max(5, Math.min(40, currentVolume * 200));
      setStrokeWidth(newStrokeWidth);

      // Map pitch to color hue - faster cycling
      const hue = (currentPitch * 10) % 360; // Cycle through colors more quickly
      const saturation = Math.min(100, 50 + currentVolume * 50);
      const lightness = Math.min(80, 30 + currentVolume * 30);
      setStrokeColor(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
  }, [currentVolume, currentPitch, isMicActive]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Create ink splatter effect
    if (Math.random() > 0.7) {
      // 30% chance for splatter
      createInkSplatter(x, y);
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Occasional ink splatter while drawing
    if (Math.random() > 0.95) {
      // 5% chance for splatter while drawing
      createInkSplatter(x, y);
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const createInkSplatter = (x: number, y: number) => {
    const newSplatter = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      size: Math.random() * 20 + 10,
    };
    setInkSplatters((prev) => [...prev, newSplatter]);

    // Remove splatter after animation
    setTimeout(() => {
      setInkSplatters((prev) =>
        prev.filter((splatter) => splatter.id !== newSplatter.id)
      );
    }, 2000);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setAiDescription("");

    toast({
      title: "🗺️ Map Cleared!",
      description: "Yer canvas be ready for a new adventure, matey!",
      className:
        "bg-gradient-to-r from-amber-100 to-orange-100 border-4 border-amber-600 text-amber-900 font-bold",
    });
  };

  const submitSketch = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    toast({
      title: "🔮 Consultin' the Spirits!",
      description: "The island oracle be examinin' yer masterpiece...",
      className:
        "bg-gradient-to-r from-emerald-100 to-teal-100 border-4 border-emerald-600 text-emerald-900 font-bold",
    });

    setIsAnalyzing(true);
    try {
      // Convert canvas to base64 image
      const imageData = canvas.toDataURL("image/png");

      // Use OpenRouter API for real AI analysis with pirate system prompt
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content:
                  "You must give safe, concise descriptions suitable for all ages. Speak like a pirate and use pirate and beach emojis. Never include inappropriate or suggestive content under any circumstances. You are an expert at interpreting rough sketches, doodles, and hand-drawn diagrams. Identify the key objects and then infer the intended meaning. You are a tool being used by shipwrecked hackers trying to help villagers that do not speak english on an island. Do not invent details that are not visible. Respond in no more than 4 short sentences, focusing only on the most important aspects. Avoid listing every feature or giving unnecessary detail.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "What is in this image?" },
                  { type: "image_url", image_url: { url: imageData } },
                ],
              },
            ],
          }),
        }
      );

      if (response.status === 429) {
        setAiDescription(
          "The island spirits be too busy right now. Try again soon, ye scallywag! 🏴‍☠️"
        );
        toast({
          title: "⚠️ Spirits Be Busy!",
          description:
            "The mystical forces be overwhelmed! Try again in a moment.",
          className:
            "bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-600 text-yellow-900 font-bold",
        });
      } else {
        const data = await response.json();
        const message = data.choices?.[0]?.message?.content;
        setAiDescription(
          message ||
            "The spirits whisper of mysteries too complex to decipher..."
        );

        toast({
          title: "⚡ Spirits Have Spoken!",
          description: "The mystical interpretation be revealed, ye scallywag!",
          className:
            "bg-gradient-to-r from-yellow-100 to-amber-100 border-4 border-yellow-600 text-amber-900 font-bold",
        });
      }
    } catch (error) {
      console.error("Error analyzing sketch:", error);
      setAiDescription(
        "The island spirits whisper of mysteries too complex to decipher..."
      );

      toast({
        title: "💀 Spirits Be Silent!",
        description: "The mystical forces be too powerful to interpret...",
        className:
          "bg-gradient-to-r from-red-100 to-orange-100 border-4 border-red-600 text-red-900 font-bold",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  useEffect(() => {
    startMicrophone();
  }, [startMicrophone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 relative overflow-hidden">
      {/* Enhanced decorative background elements */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-amber-800 to-orange-800 rounded-full animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-24 h-24 bg-gradient-to-br from-orange-700 to-red-700 rounded-full animate-bounce"
          style={{ animationDuration: "3s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-yellow-800 to-amber-800 rounded-full animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full animate-ping"
          style={{ animationDuration: "4s" }}
        ></div>
      </div>

      {/* Pirate ship silhouette background */}
      <div
        className="absolute inset-0 bg-no-repeat bg-center bg-contain opacity-5"
        style={{
          backgroundImage: "url('/pirate-ship-silhouette.webp')",
          backgroundSize: "100%",
          transform: "rotate(-5deg)",
        }}
      ></div>

      {/* Enhanced rope border effect */}
      <div className="absolute inset-4 border-8 border-amber-800 rounded-3xl border-dashed opacity-40 shadow-2xl"></div>
      <div className="absolute inset-6 border-4 border-yellow-600 rounded-2xl border-dotted opacity-20"></div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-30 blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="relative">
                <Compass className="w-16 h-16 text-amber-800 drop-shadow-lg animate-pulse" />
                <div
                  className="absolute inset-0 w-16 h-16 border-4 border-amber-600 rounded-full animate-spin opacity-30"
                  style={{ animationDuration: "8s" }}
                ></div>
              </div>
              <h1
                className="text-5xl md:text-7xl font-black text-amber-900 tracking-wider drop-shadow-2xl transform -rotate-1"
                style={{
                  fontFamily: "'Pirata One', 'Creepster', cursive, serif",
                }}
              >
                SHIPWRECKED SKETCHES
              </h1>
              <div className="relative">
                <Anchor className="w-16 h-16 text-amber-800 drop-shadow-lg animate-bounce" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <div className="relative ml-4">
                <img
                  src="/villager.png"
                  alt="Island Villager"
                  className="w-16 h-16 rounded-full border-4 border-amber-600 shadow-lg animate-pulse"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-ping"></div>
              </div>
            </div>
            <div className="relative">
              <p
                className="text-xl text-amber-800 font-bold tracking-wide transform rotate-1 drop-shadow-lg"
                style={{ fontFamily: "'Kalam', 'Caveat', cursive" }}
              >
                🎨 Draw with yer voice & get mystical translations for the
                villagers! 🎤⚓
              </p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Canvas Section */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-amber-600 shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-800 to-orange-800 px-6 py-3 rounded-full shadow-xl border-4 border-yellow-600">
                  <Map className="w-8 h-8 text-yellow-200 animate-pulse" />
                  <h2
                    className="text-3xl font-black text-yellow-100 tracking-wider drop-shadow-lg"
                    style={{ fontFamily: "'Pirata One', cursive" }}
                  >
                    EXPLORER'S CANVAS
                  </h2>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
              </div>

              {/* Audio feedback indicators */}
              {isMicActive && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
                  <div className="flex items-center justify-between text-sm text-amber-800">
                    <div className="flex items-center gap-2">
                      <span>Volume:</span>
                      <div className="w-20 h-2 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 transition-all duration-100"
                          style={{
                            width: `${Math.min(100, currentVolume * 500)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs">
                        Width: {strokeWidth.toFixed(1)}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Pitch:</span>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-amber-600"
                        style={{ backgroundColor: strokeColor }}
                      ></div>
                      <span className="text-xs">
                        {currentPitch.toFixed(0)}Hz
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Canvas */}
              <div className="relative">
                {/* Torn paper edge effects */}
                <div className="absolute -inset-2 z-0">
                  <div
                    className="w-full h-full bg-amber-100 opacity-60"
                    style={{
                      clipPath: `polygon(
                        2% 0%, 5% 2%, 8% 0%, 12% 3%, 15% 1%, 18% 4%, 22% 2%, 25% 5%, 28% 1%, 32% 4%, 35% 2%, 38% 6%, 42% 3%, 45% 7%, 48% 2%, 52% 5%, 55% 1%, 58% 4%, 62% 2%, 65% 6%, 68% 3%, 72% 7%, 75% 4%, 78% 8%, 82% 5%, 85% 9%, 88% 6%, 92% 10%, 95% 7%, 98% 11%, 100% 8%, 100% 15%, 98% 18%, 100% 22%, 97% 25%, 100% 28%, 96% 32%, 100% 35%, 95% 38%, 100% 42%, 94% 45%, 100% 48%, 93% 52%, 100% 55%, 92% 58%, 100% 62%, 91% 65%, 100% 68%, 90% 72%, 100% 75%, 89% 78%, 100% 82%, 88% 85%, 100% 88%, 87% 92%, 100% 95%, 86% 98%, 100% 100%, 92% 100%, 89% 98%, 86% 100%, 83% 97%, 80% 100%, 77% 96%, 74% 100%, 71% 95%, 68% 100%, 65% 94%, 62% 100%, 59% 93%, 56% 100%, 53% 92%, 50% 100%, 47% 91%, 44% 100%, 41% 90%, 38% 100%, 35% 89%, 32% 100%, 29% 88%, 26% 100%, 23% 87%, 20% 100%, 17% 86%, 14% 100%, 11% 85%, 8% 100%, 5% 84%, 2% 100%, 0% 95%, 2% 92%, 0% 89%, 3% 86%, 0% 83%, 4% 80%, 0% 77%, 5% 74%, 0% 71%, 6% 68%, 0% 65%, 7% 62%, 0% 59%, 8% 56%, 0% 53%, 9% 50%, 0% 47%, 10% 44%, 0% 41%, 11% 38%, 0% 35%, 12% 32%, 0% 29%, 13% 26%, 0% 23%, 14% 20%, 0% 17%, 15% 14%, 0% 11%, 16% 8%, 0% 5%, 17% 2%, 0% 0%
              )`,
                    }}
                  ></div>
                </div>

                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full border-4 border-amber-700 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 shadow-inner relative z-10"
                  style={{
                    cursor: "url('/quill-cursor.png') 16 16, crosshair",
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />

                {/* Ink splatter effects */}
                {inkSplatters.map((splatter) => (
                  <div
                    key={splatter.id}
                    className="absolute pointer-events-none z-25 animate-ping"
                    style={{
                      left: splatter.x,
                      top: splatter.y,
                      width: splatter.size,
                      height: splatter.size,
                      backgroundImage: "url('/ink.png')",
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      opacity: 0.7,
                      animationDuration: "2s",
                      animationFillMode: "forwards",
                    }}
                  />
                ))}

                {/* Parchment texture overlay */}
                <div
                  className="absolute inset-0 w-full h-full border-4 border-amber-700 rounded-lg pointer-events-none z-20 opacity-30"
                  style={{
                    backgroundImage: "url('/parchment-texture.webp')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    mixBlendMode: "multiply",
                  }}
                ></div>

                {/* Wax seals in corners */}
                <div className="absolute -top-6 -left-6 w-16 h-16 z-30 opacity-80 transform rotate-12">
                  <img
                    src="/waxseal.png"
                    alt="Wax Seal"
                    className="w-full h-full drop-shadow-lg animate-pulse"
                    style={{ animationDuration: "4s" }}
                  />
                </div>

                <div className="absolute -top-6 -right-6 w-16 h-16 z-30 opacity-80 transform -rotate-12">
                  <img
                    src="/waxseal.png"
                    alt="Wax Seal"
                    className="w-full h-full drop-shadow-lg animate-pulse"
                    style={{ animationDuration: "4s", animationDelay: "1s" }}
                  />
                </div>

                <div className="absolute -bottom-6 -left-6 w-16 h-16 z-30 opacity-80 transform -rotate-12">
                  <img
                    src="/waxseal.png"
                    alt="Wax Seal"
                    className="w-full h-full drop-shadow-lg animate-pulse"
                    style={{ animationDuration: "4s", animationDelay: "2s" }}
                  />
                </div>

                <div className="absolute -bottom-6 -right-6 w-16 h-16 z-30 opacity-80 transform rotate-12">
                  <img
                    src="/waxseal.png"
                    alt="Wax Seal"
                    className="w-full h-full drop-shadow-lg animate-pulse"
                    style={{ animationDuration: "4s", animationDelay: "3s" }}
                  />
                </div>

                {/* Decorative compass rose overlay */}
                <div className="absolute top-4 right-4 w-16 h-16 opacity-20 z-30">
                  <Compass
                    className="w-full h-full text-amber-800 animate-spin"
                    style={{ animationDuration: "20s" }}
                  />
                </div>

                {/* Additional parchment aging effects */}
                <div className="absolute inset-0 w-full h-full border-4 border-amber-700 rounded-lg pointer-events-none z-25 opacity-10">
                  <div className="absolute top-2 left-2 w-8 h-8 bg-amber-800 rounded-full blur-sm"></div>
                  <div className="absolute top-1/3 right-4 w-6 h-6 bg-orange-700 rounded-full blur-sm"></div>
                  <div className="absolute bottom-4 left-1/4 w-10 h-10 bg-yellow-800 rounded-full blur-sm"></div>
                  <div className="absolute bottom-1/3 right-1/3 w-4 h-4 bg-amber-700 rounded-full blur-sm"></div>
                  <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-orange-600 rounded-full blur-sm"></div>
                </div>

                {/* Subtle paper grain effect */}
                <div
                  className="absolute inset-0 w-full h-full border-4 border-amber-700 rounded-lg pointer-events-none z-15 opacity-5"
                  style={{
                    background: `
                      radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.3) 1px, transparent 1px),
                      radial-gradient(circle at 80% 70%, rgba(160, 82, 45, 0.3) 1px, transparent 1px),
                      radial-gradient(circle at 40% 80%, rgba(139, 69, 19, 0.2) 1px, transparent 1px),
                      radial-gradient(circle at 60% 20%, rgba(160, 82, 45, 0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: "3px 3px, 4px 4px, 2px 2px, 5px 5px",
                  }}
                ></div>
              </div>

              {/* Canvas controls */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={clearCanvas}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-6 py-3 rounded-xl shadow-xl border-4 border-red-800 transform hover:scale-105 transition-all text-lg"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Clear Map
                </Button>

                <Button
                  onClick={submitSketch}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-6 py-3 rounded-xl shadow-xl border-4 border-emerald-800 transform hover:scale-105 transition-all disabled:opacity-50 text-lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {isAnalyzing ? "Consultin' Spirits..." : "Analyze Sketch"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Controls and Results */}
          <div className="space-y-6">
            {/* AI Model Selection */}
            <Card className="p-6 bg-gradient-to-br from-orange-100 to-amber-100 border-4 border-amber-600 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-yellow-400 to-transparent opacity-20 rounded-bl-full"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-orange-400 to-transparent opacity-20 rounded-tr-full"></div>
              <div className="relative z-10">
                <h3
                  className="text-2xl font-black text-amber-900 mb-4 text-center tracking-wider drop-shadow-lg"
                  style={{ fontFamily: "'Pirata One', cursive" }}
                >
                  🔮 ISLAND ORACLE 🔮
                </h3>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="border-4 border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 font-bold shadow-inner">
                    <SelectValue placeholder="Choose yer mystical guide..." />
                  </SelectTrigger>
                  <SelectContent className="bg-amber-50 border-4 border-amber-600">
                    <SelectItem
                      value="qwen/qwen2.5-vl-32b-instruct:free"
                      className="font-bold text-amber-900"
                    >
                      🧙‍♂️ Qwen 2.5-vl (Vision Expert)
                    </SelectItem>
                    <SelectItem
                      value="google/gemini-2.0-flash-exp:free"
                      className="font-bold text-amber-900"
                    >
                      ⚡ Gemini 2.0 Flash (Swift Oracle)
                    </SelectItem>
                    <SelectItem
                      value="mistralai/mistral-small-3.2-24b-instruct:free"
                      className="font-bold text-amber-900"
                    >
                      🌟 Mistral Small 3.2 (Island Shaman)
                    </SelectItem>
                    <SelectItem
                      value="meta-llama/llama-3.2-11b-vision-instruct:free"
                      className="font-bold text-amber-900"
                    >
                      🦙 Llama 3.2 Vision (Ancient Spirit)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* AI Analysis Results */}
            <Card className="p-6 bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-amber-600 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-transparent to-orange-200 opacity-30"></div>
              <div className="absolute top-2 right-2 w-8 h-8 bg-yellow-400 rounded-full opacity-40 animate-pulse"></div>
              <div
                className="absolute bottom-2 left-2 w-6 h-6 bg-orange-400 rounded-full opacity-40 animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>

              <div className="relative z-10">
                <h3
                  className="text-2xl font-black text-amber-900 mb-6 text-center tracking-wider drop-shadow-lg"
                  style={{ fontFamily: "'Pirata One', cursive" }}
                >
                  ✨ MYSTICAL INTERPRETATION ✨
                </h3>

                {isAnalyzing ? (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                      <Compass className="w-16 h-16 text-amber-600 animate-spin mx-auto mb-6" />
                      <div
                        className="absolute inset-0 w-16 h-16 border-4 border-dashed border-yellow-500 rounded-full animate-spin opacity-50"
                        style={{
                          animationDirection: "reverse",
                          animationDuration: "3s",
                        }}
                      ></div>
                    </div>
                    <p
                      className="text-amber-800 font-bold text-lg tracking-wide"
                      style={{ fontFamily: "'Kalam', cursive" }}
                    >
                      🌊 The island spirits be decipherin' yer creation... 🌊
                    </p>
                    <div className="flex justify-center gap-2 mt-4">
                      <div className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-amber-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                ) : aiDescription ? (
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-4 border-amber-400 shadow-inner relative">
                    <div className="absolute top-2 left-2 text-2xl">📜</div>
                    <div className="absolute bottom-2 right-2 text-2xl">⚓</div>
                    <p
                      className="text-amber-900 font-bold leading-relaxed text-lg pl-8 pr-8"
                      style={{ fontFamily: "'Kalam', cursive" }}
                    >
                      "{aiDescription}"
                    </p>
                  </div>
                ) : (
                  <div
                    className="text-center py-12 text-amber-700 font-bold text-lg"
                    style={{ fontFamily: "'Kalam', cursive" }}
                  >
                    🎨 Draw yer vision and let the island spirits reveal its
                    secrets, ye landlubber! 🏴‍☠️
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
