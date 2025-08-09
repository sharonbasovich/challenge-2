"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Compass, Send, Trash2, Mic, MicOff } from "lucide-react";

export default function LiveCanvasTranslator() {
  const sysPrompt =
    "You must give safe, concise descriptions suitable for all ages. Speak like a pirate and use pirate and beach emojis. Never include inappropriate or suggestive content under any circumstances. You are an expert at interpreting rough sketches, doodles, and hand-drawn diagrams. Identify the key objects and then infer the intended meaning. You are a tool being used by shipwrecked hackers trying to help villagers that do not speak english on an island. Do not invent details that are not visible. Respond in no more than 4 short sentences, focusing only on the most important aspects. Avoid listing every feature or giving unnecessary detail.";

  const [selectedModel, setSelectedModel] = useState(
    "qwen/qwen2.5-vl-32b-instruct:free"
  );
  const [aiDescription, setAiDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const volume = useRef(0);
  const pitch = useRef(0);

  // Audio context and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const { toast } = useToast();

  // Setup audio analysis
  useEffect(() => {
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (context) {
      context.lineCap = "round";
      context.lineWidth = 2;
      ctx.current = context;
    }
  }, []);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micStreamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyzerRef.current = analyser;

      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Float32Array(analyser.frequencyBinCount);

      function analyze() {
        if (!analyzerRef.current) return;

        analyzerRef.current.getFloatTimeDomainData(timeData);

        // Volume → RMS
        let sumSquares = 0;
        for (let i = 0; i < timeData.length; i++)
          sumSquares += timeData[i] ** 2;
        volume.current = Math.sqrt(sumSquares / timeData.length) * 10;

        // Pitch → peak frequency
        analyzerRef.current.getFloatFrequencyData(freqData);
        let maxIndex = 0;
        for (let i = 1; i < freqData.length; i++) {
          if (freqData[i] > freqData[maxIndex]) maxIndex = i;
        }
        const nyquist = audioCtx.sampleRate / 2;
        pitch.current = (maxIndex / freqData.length) * nyquist;

        animationFrameRef.current = requestAnimationFrame(analyze);
      }
      analyze();
      setIsMicActive(true);

      toast({
        title: "🎤 Mic Activated!",
        description: "Draw with voice to create dynamic art, matey!",
        className:
          "bg-gradient-to-r from-green-100 to-emerald-100 border-4 border-green-600 text-green-900 font-bold",
      });
    } catch (e) {
      console.error("Mic error", e);
      toast({
        title: "⚠️ Mic Error",
        description: "Cannot access microphone, using default drawing mode.",
        className:
          "bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-600 text-yellow-900 font-bold",
      });
    }
  };

  const stopMicrophone = () => {
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
    volume.current = 0;
    pitch.current = 0;

    toast({
      title: "🔇 Mic Deactivated",
      description: "Back to normal drawing mode.",
      className:
        "bg-gradient-to-r from-gray-100 to-slate-100 border-4 border-gray-600 text-gray-900 font-bold",
    });
  };

  // Drawing handlers
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!ctx.current) return;
    isDrawing.current = true;
    ctx.current.beginPath();
    ctx.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !ctx.current) return;

    let hue, width;

    if (isMicActive) {
      // Use audio input for color and width
      hue = ((pitch.current - 80) / (1100 - 80)) * 360;
      width = Math.min(Math.max(volume.current * 10, 1), 50);
    } else {
      // Default drawing style
      hue = 30; // Brown/amber color
      width = 3;
    }

    ctx.current.strokeStyle = `hsl(${hue.toFixed(0)}, 70%, 50%)`;
    ctx.current.lineWidth = width;
    ctx.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.current.stroke();
  }

  function stopDrawing() {
    isDrawing.current = false;
    ctx.current?.closePath();
  }

  function clearCanvas() {
    if (!ctx.current || !canvasRef.current) return;
    ctx.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    setAiDescription("");

    toast({
      title: "🗺️ Canvas Cleared!",
      description: "Ready for a new masterpiece, ye artist!",
      className:
        "bg-gradient-to-r from-blue-100 to-cyan-100 border-4 border-blue-600 text-blue-900 font-bold",
    });
  }

  // Form submit → send to OpenRouter
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canvasRef.current) return;

    setIsAnalyzing(true);
    toast({
      title: "🔮 Consulting the Spirits!",
      description: "The island oracle be examining yer masterpiece...",
      className:
        "bg-gradient-to-r from-purple-100 to-indigo-100 border-4 border-purple-600 text-purple-900 font-bold",
    });

    const base64Image = canvasRef.current.toDataURL("image/png");

    try {
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
                content: sysPrompt,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "What is in this image?" },
                  { type: "image_url", image_url: { url: base64Image } },
                ],
              },
            ],
          }),
        }
      );

      if (response.status === 429) {
        toast({
          title: "⚠️ Model Busy",
          description:
            "The spirits be overwhelmed! Try again in a moment, matey.",
          className:
            "bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-600 text-yellow-900 font-bold",
        });
        setAiDescription(
          "The island spirits be too busy right now. Try again soon, ye scallywag! 🏴‍☠️"
        );
      } else {
        const data = await response.json();
        const message = data.choices?.[0]?.message?.content;
        console.log(message);
        setAiDescription(
          message ||
            "The spirits whisper of mysteries too complex to decipher..."
        );

        toast({
          title: "⚡ Spirits Have Spoken!",
          description: "The mystical interpretation be revealed!",
          className:
            "bg-gradient-to-r from-green-100 to-emerald-100 border-4 border-green-600 text-green-900 font-bold",
        });
      }
    } catch (error) {
      console.error("Error:", error);
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
  }

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 relative overflow-hidden">
      {/* Background decorative elements */}
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
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-6 mb-6">
            <Compass className="w-16 h-16 text-amber-800 drop-shadow-lg animate-pulse" />
            <h1
              className="text-5xl md:text-7xl font-black text-amber-900 tracking-wider drop-shadow-2xl"
              style={{
                fontFamily: "'Pirata One', 'Creepster', cursive, serif",
              }}
            >
              LIVE CANVAS TRANSLATOR
            </h1>
            <Image
              src="/villager.png"
              alt="Villager"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <p
            className="text-xl text-amber-800 font-bold tracking-wide"
            style={{ fontFamily: "'Kalam', 'Caveat', cursive" }}
          >
            🎨 Draw with yer voice to create magical art for the villagers! 🎨
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Canvas Section */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-amber-600 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-3xl font-black text-amber-900 tracking-wider"
                  style={{ fontFamily: "'Pirata One', cursive" }}
                >
                  DRAWING CANVAS
                </h2>
                <Button
                  onClick={isMicActive ? stopMicrophone : startMicrophone}
                  className={`${
                    isMicActive
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  } text-white font-bold px-4 py-2 rounded-xl shadow-xl border-4 ${
                    isMicActive ? "border-red-800" : "border-green-800"
                  }`}
                >
                  {isMicActive ? (
                    <MicOff className="w-5 h-5 mr-2" />
                  ) : (
                    <Mic className="w-5 h-5 mr-2" />
                  )}
                  {isMicActive ? "Stop Mic" : "Start Mic"}
                </Button>
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
                            width: `${Math.min(100, volume.current * 500)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs">
                        Width:{" "}
                        {Math.min(Math.max(volume.current * 10, 1), 50).toFixed(
                          1
                        )}
                        px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Pitch:</span>
                      <div
                        className="w-6 h-6 rounded-full border-2 border-amber-600"
                        style={{
                          backgroundColor: `hsl(${
                            ((pitch.current - 80) / (1100 - 80)) * 360
                          }, 70%, 50%)`,
                        }}
                      ></div>
                      <span className="text-xs">
                        {pitch.current.toFixed(0)}Hz
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full border-4 border-amber-700 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 shadow-inner cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />

              {/* Canvas controls */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={clearCanvas}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-6 py-3 rounded-xl shadow-xl border-4 border-red-800"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Clear Canvas
                </Button>

                <form onSubmit={handleSubmit} className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-6 py-3 rounded-xl shadow-xl border-4 border-emerald-800 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {isAnalyzing ? "Translating..." : "Translate!"}
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Controls and Results */}
          <div className="space-y-6">
            {/* Model Selection */}
            <Card className="p-6 bg-gradient-to-br from-orange-100 to-amber-100 border-4 border-amber-600 shadow-2xl">
              <h3
                className="text-2xl font-black text-amber-900 mb-4 text-center tracking-wider"
                style={{ fontFamily: "'Pirata One', cursive" }}
              >
                🔮 AI MODEL 🔮
              </h3>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="border-4 border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-amber-50 border-4 border-amber-600">
                  <SelectItem value="qwen/qwen2.5-vl-32b-instruct:free">
                    Qwen 2.5-vl
                  </SelectItem>
                  <SelectItem value="google/gemini-2.0-flash-exp:free">
                    Gemini 2.0 Flash
                  </SelectItem>
                  <SelectItem value="mistralai/mistral-small-3.2-24b-instruct:free">
                    Mistral Small 3.2
                  </SelectItem>
                  <SelectItem value="meta-llama/llama-3.2-11b-vision-instruct:free">
                    Llama 3.2 Vision
                  </SelectItem>
                </SelectContent>
              </Select>
            </Card>

            {/* Translation Results */}
            <Card className="p-6 bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-amber-600 shadow-2xl">
              <h3
                className="text-2xl font-black text-amber-900 mb-6 text-center tracking-wider"
                style={{ fontFamily: "'Pirata One', cursive" }}
              >
                ✨ TRANSLATION ✨
              </h3>

              {isAnalyzing ? (
                <div className="text-center py-12">
                  <Compass className="w-16 h-16 text-amber-600 animate-spin mx-auto mb-6" />
                  <p
                    className="text-amber-800 font-bold text-lg"
                    style={{ fontFamily: "'Kalam', cursive" }}
                  >
                    🌊 Translating yer art for the villagers... 🌊
                  </p>
                </div>
              ) : aiDescription ? (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-4 border-amber-400 shadow-inner">
                  <Textarea
                    value={aiDescription}
                    readOnly
                    className="border-none bg-transparent text-amber-900 font-bold text-lg resize-none"
                    style={{ fontFamily: "'Kalam', cursive" }}
                    rows={6}
                  />
                </div>
              ) : (
                <div
                  className="text-center py-12 text-amber-700 font-bold text-lg"
                  style={{ fontFamily: "'Kalam', cursive" }}
                >
                  🎨 Draw yer vision and I'll translate it for the villagers! 🏴‍☠️
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
