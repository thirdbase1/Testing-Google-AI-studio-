"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Upload,
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  Compass,
  MapPin,
  Map,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  ExternalLink,
  Info,
  History,
  CheckCircle2,
  X,
  HelpCircle
} from "lucide-react";
import { LandmarkData, sampleLandmarks, KeyFeature } from "@/lib/sampleData";

export default function PhotoTourismApp() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"scan" | "passport">("scan");

  // Core State
  const [history, setHistory] = useState<LandmarkData[]>([]);
  const [selectedLandmark, setSelectedLandmark] = useState<LandmarkData | null>(null);
  const [currentStep, setCurrentStep] = useState<"idle" | "capturing" | "identifying" | "searching" | "narrating" | "ready">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera & Capture State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio / Narration State
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>(new Array(16).fill(15));
  const waveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active Hotspot
  const [activeHotspot, setActiveHotspot] = useState<KeyFeature | null>(null);

  // Telemetry (flickers in purely for cosmetic tourist immersion)
  const [gpsCoords, setGpsCoords] = useState<string>("Searching GPS...");
  const [compassDir, setCompassDir] = useState<number>(0);
  const [timeString, setTimeString] = useState<string>("---");

  // Handle camera toggle (Declared above effects to resolve hoisting/use before declaration)
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setCurrentStep("capturing");
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMessage("Could not access camera. Please check camera permissions or upload an image instead.");
    }
  };

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("photo_tourism_history");
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
      }
    }

    // Geolocation mock/real
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords(`${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° W`);
        },
        () => {
          setGpsCoords("51.5074° N, 0.1278° W"); // Default to London coordinates
        }
      );
    } else {
      setGpsCoords("51.5074° N, 0.1278° W");
    }

    // Set initial client-side time to prevent server/client hydration mismatch
    setTimeString(new Date().toLocaleTimeString() + " UTC");

    // Dynamic compass rotation & time updater
    const interval = setInterval(() => {
      setCompassDir((prev) => (prev + Math.floor(Math.random() * 5) - 2 + 360) % 360);
      setTimeString(new Date().toLocaleTimeString() + " UTC");
    }, 1000);

    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, []);

  // Sync current time of playing audio
  useEffect(() => {
    if (audioPlaying) {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 50) + 10)
        );
      }, 100);
    } else {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWaveHeights(new Array(16).fill(15));
    }

    return () => {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, [audioPlaying]);

  // Capture photo from video
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(dataUrl);
        stopCamera();
        processLandmark(dataUrl);
      }
    }
  };

  // Uploaded photo handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedPhoto(dataUrl);
        stopCamera();
        processLandmark(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // The main execution pipeline
  const processLandmark = async (imageDataUrl: string) => {
    setErrorMessage(null);
    setActiveHotspot(null);
    stopAudio();

    try {
      // Step 1: Identify using gemini-3.1-pro-preview
      setCurrentStep("identifying");
      const identRes = await fetch("/api/gemini/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!identRes.ok) {
        throw new Error("Failed to identify the landmark. Make sure the image is clear.");
      }

      const identData = await identRes.json();
      if (identData.error) throw new Error(identData.error);

      // Step 2: Search grounding using gemini-3.5-flash
      setCurrentStep("searching");
      const historyRes = await fetch("/api/gemini/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landmarkName: identData.landmarkName,
          city: identData.city,
          country: identData.country,
          searchQueries: identData.searchQueries,
        }),
      });

      if (!historyRes.ok) {
        throw new Error("Failed to retrieve historical search grounding data.");
      }

      const historyData = await historyRes.json();
      if (historyData.error) throw new Error(historyData.error);

      // Step 3: Text-to-Speech using gemini-3.1-flash-tts-preview
      setCurrentStep("narrating");
      const ttsRes = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: historyData.narratorScript }),
      });

      if (!ttsRes.ok) {
        throw new Error("Failed to generate voice narration.");
      }

      const ttsData = await ttsRes.json();
      if (ttsData.error) throw new Error(ttsData.error);

      // Combine into final landmark profile
      // eslint-disable-next-line react-hooks/purity
      const finalId = `scan_${Date.now()}`;
      const finalLandmark: LandmarkData = {
        id: finalId,
        landmarkName: identData.landmarkName,
        city: identData.city,
        country: identData.country,
        coordinates: identData.coordinates || gpsCoords,
        imageUrl: imageDataUrl,
        shortDescription: identData.shortDescription,
        detailedHistory: historyData.detailedHistory,
        funFacts: historyData.funFacts,
        keyFeatures: identData.keyFeatures,
        searchQueries: identData.searchQueries,
        narratorScript: historyData.narratorScript,
        citations: historyData.citations,
      };

      setAudioBase64(ttsData.audio);
      setSelectedLandmark(finalLandmark);

      // Update history in localStorage
      const updatedHistory = [finalLandmark, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("photo_tourism_history", JSON.stringify(updatedHistory));

      setCurrentStep("ready");

      // Auto play narration
      playNarration(ttsData.audio);

    } catch (err: any) {
      console.error("Pipeline failed:", err);
      setErrorMessage(err.message || "An unexpected error occurred during analysis.");
      setCurrentStep("idle");
    }
  };

  // Instant Sample Launcher
  const launchSample = async (sample: LandmarkData) => {
    setErrorMessage(null);
    setActiveHotspot(null);
    stopAudio();
    setSelectedLandmark(sample);
    setCapturedPhoto(sample.imageUrl);
    setCurrentStep("narrating");

    try {
      // Call TTS live for the sample so it generates genuine spoken voice
      const ttsRes = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: sample.narratorScript }),
      });

      if (!ttsRes.ok) {
        throw new Error("Failed to generate voice narration for sample.");
      }

      const ttsData = await ttsRes.json();
      setAudioBase64(ttsData.audio);
      setCurrentStep("ready");
      playNarration(ttsData.audio);
    } catch (err: any) {
      console.error("Sample TTS loading failed:", err);
      // Fallback: load text content anyway, can listen manually
      setErrorMessage("Loaded details successfully, but voice generation had a temporary issue.");
      setCurrentStep("ready");
    }
  };

  // Re-open past scan
  const loadPastScan = (scan: LandmarkData) => {
    setErrorMessage(null);
    setActiveHotspot(null);
    stopAudio();
    setSelectedLandmark(scan);
    setCapturedPhoto(scan.imageUrl);
    setCurrentStep("ready");
    setActiveTab("scan");
    // Regenerate or load audio if base64 isn't cached (we generate on demand)
    launchSample(scan);
  };

  // Audio playback controls
  const playNarration = (base64AudioStr: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `data:audio/wav;base64,${base64AudioStr}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration || 30);
    });

    audio.addEventListener("timeupdate", () => {
      setAudioCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setAudioPlaying(false);
      setAudioCurrentTime(0);
    });

    audio.play().then(() => {
      setAudioPlaying(true);
    }).catch(e => {
      console.error("Audio playback interrupted:", e);
    });
  };

  const togglePlayback = () => {
    if (!audioRef.current && audioBase64) {
      playNarration(audioBase64);
      return;
    }

    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setAudioPlaying(true);
        });
      }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

  const resetPipeline = () => {
    stopAudio();
    stopCamera();
    setSelectedLandmark(null);
    setCapturedPhoto(null);
    setCurrentStep("idle");
    setErrorMessage(null);
  };

  // Subtitle calculation
  const getCurrentSentence = () => {
    if (!selectedLandmark) return "";
    const script = selectedLandmark.narratorScript;
    const sentences = script.split(/(?<=[.!?])\s+/);
    if (sentences.length === 0) return "";

    if (!audioDuration || audioCurrentTime === 0) return sentences[0];

    const ratio = audioCurrentTime / audioDuration;
    const index = Math.min(
      Math.floor(ratio * sentences.length),
      sentences.length - 1
    );
    return sentences[index];
  };

  // Gamification: Badges
  const getBadges = () => {
    const badges = [];
    const scannedNames = history.map(h => h.landmarkName.toLowerCase());
    const scannedCities = history.map(h => h.city.toLowerCase());

    if (history.length >= 1) {
      badges.push({
        name: "First Landmark",
        desc: "Stamped your first scan in the passport.",
        unlocked: true,
        icon: "🧭",
      });
    } else {
      badges.push({ name: "First Landmark", desc: "Scan a landmark to stamp.", unlocked: false, icon: "🧭" });
    }

    const hasEiffel = scannedNames.includes("eiffel tower");
    const hasColosseum = scannedNames.includes("the colosseum") || scannedNames.includes("colosseum");
    const hasTaj = scannedNames.includes("taj mahal");

    badges.push({
      name: "Eiffel Witness",
      desc: "Scanned or loaded the Eiffel Tower in Paris.",
      unlocked: hasEiffel,
      icon: "🇫🇷",
    });

    badges.push({
      name: "Roman Patrician",
      desc: "Explored the great Flavian Amphitheatre.",
      unlocked: hasColosseum,
      icon: "🇮🇹",
    });

    badges.push({
      name: "Agra Romantic",
      desc: "Scanned the monument of eternal devotion.",
      unlocked: hasTaj,
      icon: "🇮🇳",
    });

    const uniqueCountries = new Set(history.map(h => h.country));
    badges.push({
      name: "Global Voyager",
      desc: "Scanned sights in 2 or more countries.",
      unlocked: uniqueCountries.size >= 2,
      icon: "🌍",
    });

    return badges;
  };

  const progressPercent = audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen text-slate-100 bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950" id="main_app_container">
      {/* HUD Top Status Bar */}
      <div className="w-full bg-slate-900 border-b border-slate-800/60 px-4 py-2.5 flex flex-wrap justify-between items-center text-xs text-slate-400 font-mono gap-3 z-10" id="top_telemetry_bar">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            PHOTO TOURISM AR
          </span>
          <span className="hidden sm:inline border-l border-slate-800 pl-4">LAT/LONG: <span className="text-slate-200">{gpsCoords}</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline">SYS_STATUS: <span className="text-emerald-400">ONLINE</span></span>
          <span className="hidden sm:inline">COMPASS: <span className="text-slate-200">{compassDir}° {compassDir < 45 || compassDir >= 315 ? "N" : compassDir < 135 ? "E" : compassDir < 225 ? "S" : "W"}</span></span>
          <span className="border-l border-slate-800 pl-4">{timeString}</span>
        </div>
      </div>

      {/* Primary Navigation Header */}
      <header className="bg-slate-900/40 backdrop-blur-md sticky top-0 border-b border-slate-900 py-3 px-4 sm:px-6 flex justify-between items-center z-10" id="app_header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg shadow-lg shadow-cyan-500/20">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              City Landmark Guide
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono hidden sm:block">AI Sightseeing & AR-Style Audio Narrator</p>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800" id="main_navigation">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "scan"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-100"
            }`}
            id="tab_trigger_scan"
          >
            <Camera className="h-3.5 w-3.5" />
            Scanner View
          </button>
          <button
            onClick={() => setActiveTab("passport")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
              activeTab === "passport"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-100"
            }`}
            id="tab_trigger_passport"
          >
            <MapPin className="h-3.5 w-3.5" />
            Travel Passport
            {history.length > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-cyan-500 text-slate-950 text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {history.length}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 relative" id="app_content">
        <AnimatePresence mode="wait">
          {activeTab === "scan" ? (
            <motion.div
              key="scan_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start"
              id="scanner_tab_view"
            >
              {/* Left Column: Camera, Capture, HUD Viewfinder */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 aspect-video flex flex-col items-center justify-center shadow-2xl" id="hud_viewfinder_container">
                  {/* AR Corner Overlays (Immersion details) */}
                  <div className="absolute top-4 left-4 border-t-2 border-l-2 border-cyan-500/60 w-6 h-6 z-10 pointer-events-none" />
                  <div className="absolute top-4 right-4 border-t-2 border-r-2 border-cyan-500/60 w-6 h-6 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 border-b-2 border-l-2 border-cyan-500/60 w-6 h-6 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 border-b-2 border-r-2 border-cyan-500/60 w-6 h-6 z-10 pointer-events-none" />

                  {/* Shutter effect / Camera flash */}
                  {currentStep === "identifying" && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 bg-white z-20 pointer-events-none"
                    />
                  )}

                  {/* Active Camera Feed */}
                  {cameraActive && (
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover transform scale-x-[-1]"
                      playsInline
                      muted
                    />
                  )}

                  {/* Display Mode: Captured Photo with Overlay Hotspots */}
                  {capturedPhoto && !cameraActive && (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                      {/* Captured Image */}
                      <img
                        src={capturedPhoto}
                        alt="Scanned landmark"
                        className="max-h-full max-w-full object-contain"
                      />

                      {/* AR Tracking Grid Animation (Cosmetic scanned lines) */}
                      {currentStep !== "ready" && (
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,150,250,0.05)_1px,transparent_1px)] bg-[size:100%_30px] animate-[pulse_2s_infinite] pointer-events-none">
                          <div className="w-full h-0.5 bg-cyan-400/30 animate-[bounce_3s_infinite]" />
                        </div>
                      )}

                      {/* AR Pulse hot-spots (Overlay Coordinates) */}
                      {selectedLandmark && currentStep === "ready" && (
                        <>
                          {selectedLandmark.keyFeatures.map((feature, idx) => (
                            <div
                              key={idx}
                              style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                            >
                              <button
                                onClick={() => setActiveHotspot(feature)}
                                className={`group relative flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${
                                  activeHotspot?.name === feature.name
                                    ? "bg-cyan-400 ring-4 ring-cyan-400/30 scale-110"
                                    : "bg-cyan-500/80 hover:bg-cyan-400 ring-2 ring-white/20 hover:scale-105"
                                }`}
                                title={feature.name}
                                id={`hotspot_trigger_${idx}`}
                              >
                                <span className="absolute h-6 w-6 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                                <span className="absolute h-10 w-10 rounded-full border border-cyan-400/20 animate-[spin_4s_linear_infinite] pointer-events-none" />
                                <Sparkles className={`h-3 w-3 ${activeHotspot?.name === feature.name ? "text-slate-950" : "text-white"}`} />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Idle/Empty State Viewfinder Screen */}
                  {!cameraActive && !capturedPhoto && (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-4" id="viewfinder_idle_state">
                      <div className="h-16 w-16 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
                        <Camera className="h-8 w-8 text-cyan-400 animate-pulse" />
                      </div>
                      <div className="max-w-md">
                        <h3 className="font-bold text-slate-200">AR Viewfinder Offline</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Activate your webcam to snap a picture of any world landmark, or select a sample sight below to run the immersive simulation immediately.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2.5 justify-center mt-2">
                        <button
                          onClick={startCamera}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-400/20"
                          id="btn_start_camera"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Initialize Camera
                        </button>
                        <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                          <Upload className="h-3.5 w-3.5" />
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Real-time status steppers overlay (identifying/searching/narrating) */}
                  {currentStep !== "idle" && currentStep !== "capturing" && currentStep !== "ready" && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10" id="stepper_loading_overlay">
                      <div className="w-full max-w-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-cyan-400 animate-pulse">PROCESSING DATA...</span>
                          <span className="text-xs font-mono text-slate-400">
                            {currentStep === "identifying" ? "33%" : currentStep === "searching" ? "66%" : "90%"}
                          </span>
                        </div>

                        {/* Progress slider bar */}
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-cyan-400"
                            initial={{ width: "0%" }}
                            animate={{
                              width:
                                currentStep === "identifying" ? "33%" :
                                currentStep === "searching" ? "66%" : "90%"
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        {/* Pipeline stages checklist */}
                        <div className="flex flex-col gap-3 font-mono text-xs">
                          <div className="flex items-center gap-2.5">
                            {currentStep === "identifying" ? (
                              <div className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            )}
                            <span className={currentStep === "identifying" ? "text-cyan-400 font-bold" : "text-slate-400"}>
                              [PRO-3.1] Landmark Recognition
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {currentStep === "searching" ? (
                              <div className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                            ) : currentStep === "identifying" ? (
                              <div className="h-4 w-4 rounded-full border border-slate-700" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            )}
                            <span className={currentStep === "searching" ? "text-cyan-400 font-bold" : "text-slate-400"}>
                              [FLASH-3.5] Google Search History Grounding
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {currentStep === "narrating" ? (
                              <div className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-slate-700" />
                            )}
                            <span className={currentStep === "narrating" ? "text-cyan-400 font-bold" : "text-slate-400"}>
                              [TTS-3.1] Synthesizing AR Audio Clip
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono text-center mt-2 italic">
                          {currentStep === "identifying" && "Analyzing landmark features..."}
                          {currentStep === "searching" && "Retrieving grounded historical context..."}
                          {currentStep === "narrating" && "Preparing voice translation clip..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Active Camera controls overlay */}
                  {cameraActive && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10" id="camera_active_controls">
                      <button
                        onClick={stopCamera}
                        className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 p-2.5 rounded-full transition-all shadow-lg backdrop-blur-sm"
                        title="Cancel camera"
                        id="btn_cancel_camera"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="h-16 w-16 rounded-full bg-cyan-400 hover:bg-cyan-300 border-4 border-slate-950 flex items-center justify-center transition-all shadow-xl shadow-cyan-500/20 active:scale-95"
                        title="Capture Photo"
                        id="btn_take_photo"
                      >
                        <div className="h-6 w-6 rounded-full border-2 border-slate-950" />
                      </button>
                      <div className="w-10" /> {/* Balancer */}
                    </div>
                  )}

                  {/* HUD Compass & Tracking Overlays when Image is Ready */}
                  {selectedLandmark && currentStep === "ready" && !cameraActive && (
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none font-mono text-[9px] text-cyan-400/80 z-10">
                      <div className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded border border-slate-800">
                        GPS: {selectedLandmark.coordinates}
                      </div>
                      <div className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                        <Compass className="h-3 w-3 animate-[spin_20s_linear_infinite]" />
                        HEADING: {compassDir}°
                      </div>
                    </div>
                  )}

                  {/* Canvas for video frames capture (hidden) */}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Hotspot Floating overlay block */}
                {selectedLandmark && activeHotspot && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 flex gap-3 shadow-xl"
                    id="hotspot_detail_box"
                  >
                    <div className="mt-0.5 p-2 bg-cyan-500/10 rounded-lg text-cyan-400 h-9 w-9 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                          AR Tag: {activeHotspot.name}
                        </h4>
                        <button
                          onClick={() => setActiveHotspot(null)}
                          className="text-slate-400 hover:text-slate-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-200 mt-1">{activeHotspot.description}</p>
                    </div>
                  </motion.div>
                )}

                {/* Error message card */}
                {errorMessage && (
                  <div className="bg-red-950/40 border border-red-900/60 text-red-200 p-4 rounded-xl flex gap-3 text-xs" id="app_error_card">
                    <Info className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Execution Error:</span> {errorMessage}
                      <button
                        onClick={resetPipeline}
                        className="block underline text-cyan-400 font-bold mt-1.5"
                      >
                        Reset & Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick-select Demo Landmark cards */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4" id="demo_samples_card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-cyan-400" />
                      DEMONSTRATION SIMULATOR
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">No photo needed</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {sampleLandmarks.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => launchSample(sample)}
                        disabled={currentStep !== "idle" && currentStep !== "ready"}
                        className={`flex flex-col items-start text-left rounded-lg overflow-hidden border transition-all ${
                          selectedLandmark?.landmarkName === sample.landmarkName
                            ? "border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/5"
                            : "border-slate-800 hover:border-slate-700 bg-slate-950/60"
                        }`}
                        id={`demo_sample_trigger_${sample.id}`}
                      >
                        <div className="h-16 w-full relative">
                          <img
                            src={sample.imageUrl}
                            alt={sample.landmarkName}
                            className="w-full h-full object-cover grayscale opacity-60"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 to-transparent" />
                          <div className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-slate-200 truncate">
                            {sample.landmarkName}
                          </div>
                        </div>
                        <div className="p-2 text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-cyan-400" />
                          {sample.city}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis, History Search, AR Narration Player */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {selectedLandmark ? (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-5"
                    id="ai_landmark_dashboard"
                  >
                    {/* Header profile block */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                      {/* Subtle stamp graphics background */}
                      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full border-4 border-slate-800/10 flex items-center justify-center font-mono text-[10px] text-slate-800/10 rotate-12 select-none pointer-events-none">
                        APPROVED SCAN
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 mb-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedLandmark.city}, {selectedLandmark.country}
                      </div>
                      <h2 className="text-xl font-black text-white leading-tight">
                        {selectedLandmark.landmarkName}
                      </h2>
                      <div className="text-xs font-mono text-slate-500 mt-1">
                        COORDS: {selectedLandmark.coordinates}
                      </div>
                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        {selectedLandmark.shortDescription}
                      </p>

                      <div className="flex gap-2.5 mt-4 pt-4 border-t border-slate-800/60">
                        <button
                          onClick={resetPipeline}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-all"
                        >
                          <RotateCcw className="h-3 w-3" />
                          RESCAN SIGHT
                        </button>
                      </div>
                    </div>

                    {/* Immersive AR voice player */}
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-xl p-5 shadow-xl" id="ar_narration_player">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-cyan-500/10 rounded text-cyan-400 shrink-0">
                            <Volume2 className="h-4 w-4" />
                          </span>
                          <div>
                            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200">
                              AR TOUR NARRATION
                            </h3>
                            <p className="text-[10px] text-slate-400 font-mono">TTS-3.1-Flash voice: Kore</p>
                          </div>
                        </div>

                        {/* Animated waveform visualizer bars */}
                        <div className="flex items-end gap-[2px] h-6">
                          {waveHeights.map((height, i) => (
                            <div
                              key={i}
                              style={{ height: `${height}%` }}
                              className="w-[3px] bg-cyan-400 rounded-t-sm transition-all duration-100 ease-out"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Subtitles running marquee */}
                      <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 min-h-[64px] flex items-center justify-center text-center">
                        <p className="text-sm italic font-medium text-slate-200 leading-relaxed max-w-sm">
                          &ldquo;{getCurrentSentence()}&rdquo;
                        </p>
                      </div>

                      {/* Progress audio line slider */}
                      <div className="mt-4 flex flex-col gap-1 font-mono text-[10px] text-slate-500">
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div style={{ width: `${progressPercent}%` }} className="h-full bg-cyan-400 transition-all duration-100" />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>
                            {Math.floor(audioCurrentTime / 60)}:
                            {String(Math.floor(audioCurrentTime % 60)).padStart(2, "0")}
                          </span>
                          <span>
                            {Math.floor(audioDuration / 60)}:
                            {String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                          </span>
                        </div>
                      </div>

                      {/* Playback action buttons */}
                      <div className="mt-4 flex justify-center gap-3">
                        <button
                          onClick={togglePlayback}
                          disabled={!audioBase64}
                          className="flex items-center gap-1.5 bg-cyan-400 text-slate-950 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg hover:bg-cyan-300 disabled:opacity-50"
                          id="btn_play_pause_narration"
                        >
                          {audioPlaying ? (
                            <>
                              <Pause className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                              Pause Narration
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                              Play Narration
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Historical grounding info & search citations */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                          <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
                          Grounded History & Facts
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1">Deep Chronicle Background</h3>
                      </div>

                      {/* Grounded history text block */}
                      <div className="text-xs text-slate-300 leading-relaxed font-normal bg-slate-950/40 p-4 border border-slate-900 rounded-lg max-h-56 overflow-y-auto">
                        <p>{selectedLandmark.detailedHistory}</p>
                      </div>

                      {/* Fun Facts list block */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                          Did You Know?
                        </span>
                        {selectedLandmark.funFacts.map((fact, i) => (
                          <div key={i} className="flex gap-2.5 text-xs text-slate-300 bg-slate-950/20 p-2.5 rounded border border-slate-800/40">
                            <span className="font-bold text-cyan-400 font-mono">0{i + 1}</span>
                            <p>{fact}</p>
                          </div>
                        ))}
                      </div>

                      {/* Google Search grounding sources citations */}
                      <div className="border-t border-slate-800/60 pt-4 mt-2">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide block mb-2.5">
                          Grounded Sources from Google Search:
                        </span>
                        {selectedLandmark.citations && selectedLandmark.citations.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {selectedLandmark.citations.map((cite, idx) => (
                              <a
                                key={idx}
                                href={cite.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900 hover:border-slate-800 text-[11px] text-slate-400 hover:text-cyan-400 group transition-all"
                                id={`citation_link_${idx}`}
                              >
                                <span className="truncate pr-3 group-hover:underline">
                                  {cite.title || "Grounded Search Result"}
                                </span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-mono italic">
                            No grounded sources found. Standard knowledge base used.
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px] gap-3" id="hud_empty_info">
                    <div className="h-12 w-12 rounded-full bg-slate-850/80 flex items-center justify-center text-slate-400 border border-slate-800">
                      <Compass className="h-5 w-5 text-slate-500 animate-spin-slow" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-300">Awaiting Landmark Scan</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                        Once you capture or select a city landmark, the dashboard will illuminate with interactive HUD controls, grounded histories, and voice clips.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="passport_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-start"
              id="passport_tab_view"
            >
              {/* Left Column: Explorer Profile and Stamp Badges */}
              <div className="md:col-span-4 flex flex-col gap-6">
                {/* Travel Passport ID Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden" id="passport_id_card">
                  {/* Decorative background stripes */}
                  <div className="absolute top-0 right-0 h-24 w-12 bg-gradient-to-l from-cyan-500/10 to-transparent" />

                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xl font-black">
                      TR
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Travel Explorer Passport</h3>
                      <p className="text-[10px] text-slate-500 font-mono">ID: TOURIST_991823</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block">SCANS LOGGED:</span>
                      <span className="text-white text-lg font-bold">{history.length} Sights</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">COUNTRIES:</span>
                      <span className="text-white text-lg font-bold">
                        {new Set(history.map((h) => h.country)).size} Visited
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges and achievements cabinet */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4" id="badges_cabinet">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                      <Award className="h-3.5 w-3.5 text-cyan-400" />
                      Travel Achievements
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">Earned Sights Stamps</h3>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {getBadges().map((badge, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          badge.unlocked
                            ? "bg-slate-950/60 border-slate-800"
                            : "bg-slate-950/20 border-slate-900/60 opacity-50"
                        }`}
                        id={`badge_card_${idx}`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                          badge.unlocked ? "bg-slate-900 border border-cyan-500/30" : "bg-slate-950 border border-slate-900"
                        }`}>
                          {badge.unlocked ? badge.icon : "🔒"}
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-xs font-bold ${badge.unlocked ? "text-cyan-400" : "text-slate-500"}`}>
                            {badge.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{badge.desc}</p>
                        </div>
                        {badge.unlocked && (
                          <div className="h-2 w-2 rounded-full bg-cyan-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Historical Stamp Stamp-book of Sights Scanned */}
              <div className="md:col-span-8 flex flex-col gap-5">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block">
                        Sightseeing Log
                      </span>
                      <h2 className="text-base font-bold text-white">My Visited Sights Stamp Book</h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{history.length} Scans Collected</span>
                  </div>

                  {history.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {history.map((scan) => (
                        <div
                          key={scan.id}
                          className="group bg-slate-950 border border-slate-850 rounded-xl overflow-hidden hover:border-cyan-500/40 transition-all flex flex-col"
                          id={`history_stamp_card_${scan.id}`}
                        >
                          <div className="h-32 w-full relative">
                            <img
                              src={scan.imageUrl}
                              alt={scan.landmarkName}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3">
                              <span className="inline-block bg-cyan-400/10 border border-cyan-500/20 rounded px-1.5 py-0.5 text-[9px] font-mono text-cyan-400 mb-1">
                                {scan.city}
                              </span>
                              <h4 className="text-sm font-bold text-white leading-tight">
                                {scan.landmarkName}
                              </h4>
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 mb-3">
                              {scan.shortDescription}
                            </p>
                            <button
                              onClick={() => loadPastScan(scan)}
                              className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 text-[10px] font-mono text-cyan-400 py-1.5 rounded-lg border border-slate-800/80 hover:border-slate-750 transition-all"
                              id={`history_stamp_load_trigger_${scan.id}`}
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              PLAY AR NARRATED CLIP
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-12 flex flex-col items-center justify-center text-slate-500 gap-3 border border-dashed border-slate-800 rounded-xl">
                      <div className="h-12 w-12 rounded-full border border-slate-800 flex items-center justify-center">
                        <History className="h-5 w-5 text-slate-600" />
                      </div>
                      <div className="max-w-xs">
                        <h4 className="text-slate-400 font-bold text-sm">Passport is Empty</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          You haven&apos;t scanned any city landmarks yet. Initialize the camera to start compiling your world passport stamps collection!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Applet Footer */}
      <footer className="bg-slate-900/30 border-t border-slate-900/80 py-4 px-4 sm:px-6 text-center text-[10px] font-mono text-slate-600 mt-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>PHOTO TOURISM AR • SYSTEM ENGINE ALPHA 1.0</span>
        <span>POWERED BY GOOGLE GEMINI FLASH, PRO & TTS</span>
      </footer>
    </div>
  );
}
