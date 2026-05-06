import { useEffect, useRef, useState } from "react";
import { classifyGesture, GESTURE_LABELS } from "@/lib/gestureRecognition";
import { Camera, CameraOff } from "lucide-react";

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function WebcamFeed({ onGesture, onStatusChange, paused }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const lastEmitRef = useRef({ gesture: "none", since: Date.now(), emitted: false });
  const onGestureRef = useRef(onGesture);
  onGestureRef.current = onGesture;

  const [modelStatus, setModelStatus] = useState("loading"); // loading | ready | error
  const [cameraStatus, setCameraStatus] = useState("idle"); // idle | active | error
  const [currentGesture, setCurrentGesture] = useState({ gesture: "none", confidence: 0 });

  useEffect(() => {
    onStatusChange?.({ model: modelStatus, camera: cameraStatus });
  }, [modelStatus, cameraStatus, onStatusChange]);

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    async function init() {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js");
        if (cancelled) return;

        const HandsCtor = window.Hands;
        const hands = new HandsCtor({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        hands.onResults(onResults);
        handsRef.current = hands;
        setModelStatus("ready");

        // Request camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraStatus("active");

        const CameraCtor = window.Camera;
        const cam = new CameraCtor(video, {
          onFrame: async () => {
            if (handsRef.current && !pausedRef.current) {
              await handsRef.current.send({ image: video });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = cam;
        cam.start();
      } catch (err) {
        console.error("Webcam init failed:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraStatus("error");
        } else {
          setModelStatus("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      try { cameraRef.current?.stop?.(); } catch {}
      try { handsRef.current?.close?.(); } catch {}
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause ref so callback sees latest value
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  function onResults(results) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw connections
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
      });
      // Draw landmark dots
      ctx.fillStyle = "#FFB300";
      landmarks.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      const result = classifyGesture(landmarks);
      setCurrentGesture(result);

      // Hold-to-trigger debounce: same recognised gesture for 600ms emits once
      const validGestures = ["open_palm", "fist", "thumbs_up", "thumbs_down", "peace", "point"];
      const now = Date.now();
      if (validGestures.includes(result.gesture)) {
        if (lastEmitRef.current.gesture !== result.gesture) {
          lastEmitRef.current = { gesture: result.gesture, since: now, emitted: false };
        } else if (!lastEmitRef.current.emitted && now - lastEmitRef.current.since >= 600) {
          lastEmitRef.current.emitted = true;
          onGestureRef.current?.(result);
        }
      } else {
        lastEmitRef.current = { gesture: "none", since: now, emitted: false };
      }
    } else {
      setCurrentGesture({ gesture: "none", confidence: 0 });
      lastEmitRef.current = { gesture: "none", since: Date.now(), emitted: false };
    }
  }

  return (
    <div
      className="relative w-full aspect-video bg-black border border-white/15 overflow-hidden"
      data-testid="webcam-feed"
    >
      {/* Grid background visible while loading */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* HUD corners */}
      <div className="hud-corner tl" />
      <div className="hud-corner tr" />
      <div className="hud-corner bl" />
      <div className="hud-corner br" />

      {/* Scanlines + scan beam */}
      <div className="scanlines absolute inset-0 pointer-events-none" />
      {cameraStatus === "active" && <div className="scan-line" />}

      {/* Top-left status */}
      <div className="absolute top-3 left-6 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
        <span className={`inline-block w-2 h-2 rounded-full ${cameraStatus === "active" ? "bg-[#00E5FF] pulse-dot" : "bg-[#FF3B30]"}`} />
        <span>{cameraStatus === "active" ? "LIVE FEED" : cameraStatus === "error" ? "CAMERA DENIED" : "INIT…"}</span>
      </div>

      {/* Top-right model status */}
      <div className="absolute top-3 right-6 z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
        <span>MEDIAPIPE</span>
        <span className={`inline-block w-2 h-2 rounded-full ${modelStatus === "ready" ? "bg-[#FFB300] pulse-dot" : modelStatus === "error" ? "bg-[#FF3B30]" : "bg-[#3F3F46]"}`} />
      </div>

      {/* Big gesture readout (bottom-left) */}
      <div className="absolute bottom-6 left-6 z-10" data-testid="gesture-readout">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1">DETECTED GESTURE</div>
        <div
          className={`font-mono text-3xl md:text-4xl font-medium tracking-tight ${
            currentGesture.gesture === "none" || currentGesture.gesture === "unknown"
              ? "text-white/40"
              : "text-[#00E5FF]"
          }`}
          data-testid="gesture-name"
        >
          {GESTURE_LABELS[currentGesture.gesture] || "—"}
        </div>
        <div className="font-mono text-xs text-white/50 mt-1" data-testid="gesture-confidence">
          CONF {(currentGesture.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <div className="w-12 h-px bg-white/20" />
        <div className="w-px h-12 bg-white/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Camera blocked overlay */}
      {cameraStatus === "error" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 text-center p-8">
          <CameraOff className="w-12 h-12 text-[#FF3B30] mb-4" strokeWidth={1.5} />
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF3B30] mb-2">CAMERA ACCESS DENIED</div>
          <div className="text-sm text-white/60 max-w-md">
            Allow camera access in your browser to use gesture recognition. Refresh the page after granting permission.
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {modelStatus === "loading" && cameraStatus !== "error" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
          <Camera className="w-12 h-12 text-[#00E5FF] mb-4 pulse-dot" strokeWidth={1.5} />
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">
            LOADING MEDIAPIPE MODEL<span className="cursor-blink"></span>
          </div>
        </div>
      )}
    </div>
  );
}
