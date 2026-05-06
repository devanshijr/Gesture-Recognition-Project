import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import WebcamFeed from "@/components/WebcamFeed";
import DevicePanel from "@/components/DevicePanel";
import GestureLegend from "@/components/GestureLegend";
import ActivityFeed from "@/components/ActivityFeed";
import InfoSection from "@/components/InfoSection";
import {
  fetchDevices,
  updateDevice,
  fetchGestureEvents,
  logGestureEvent,
  clearGestureEvents,
  resetDevices,
} from "@/lib/api";
import { GESTURE_ACTIONS, GESTURE_LABELS } from "@/lib/gestureRecognition";
import { Pause, Play, RefreshCcw, Activity } from "lucide-react";

function clampLevel(device, level) {
  if (device.type === "fan") return Math.max(1, Math.min(5, level));
  return Math.max(0, Math.min(100, level));
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [paused, setPaused] = useState(false);
  const [activeGesture, setActiveGesture] = useState("none");
  const [feedStatus, setFeedStatus] = useState({ model: "loading", camera: "idle" });

  const devicesRef = useRef(devices);
  const focusedRef = useRef(focusedId);
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  useEffect(() => { focusedRef.current = focusedId; }, [focusedId]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const [devs, evs] = await Promise.all([fetchDevices(), fetchGestureEvents(50)]);
        setDevices(devs);
        if (devs.length > 0) setFocusedId(devs[0].id);
        setEvents(evs);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load dashboard");
      }
    })();
  }, []);

  const focusedDevice = useMemo(
    () => devices.find((d) => d.id === focusedId) || null,
    [devices, focusedId]
  );

  const persistDevice = useCallback(async (id, payload) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...payload } : d))
    );
    try {
      const updated = await updateDevice(id, payload);
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (e) {
      console.error(e);
      toast.error("Failed to update device");
    }
  }, []);

  const recordEvent = useCallback(async ({ gesture, confidence, action, device }) => {
    const payload = {
      gesture,
      confidence,
      action,
      device_id: device?.id || null,
      device_name: device?.name || null,
    };
    // Optimistic prepend
    const optimistic = {
      id: `local-${Date.now()}`,
      ...payload,
      timestamp: new Date().toISOString(),
    };
    setEvents((prev) => [optimistic, ...prev].slice(0, 100));
    try {
      const saved = await logGestureEvent(payload);
      setEvents((prev) => [saved, ...prev.filter((e) => e.id !== optimistic.id)].slice(0, 100));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleGesture = useCallback(
    async ({ gesture, confidence }) => {
      setActiveGesture(gesture);
      // Auto-clear visual marker after a bit
      setTimeout(() => setActiveGesture((g) => (g === gesture ? "none" : g)), 800);

      const action = GESTURE_ACTIONS[gesture];
      if (!action) return;

      const list = devicesRef.current;
      const fid = focusedRef.current;
      const target = list.find((d) => d.id === fid) || list[0];
      if (!target) return;

      const label = GESTURE_LABELS[gesture];

      switch (action) {
        case "POWER_ON":
          if (!target.on) {
            await persistDevice(target.id, { on: true });
            toast.success(`${label} → ${target.name} ON`);
          } else {
            toast(`${label} → ${target.name} already on`);
          }
          break;
        case "POWER_OFF":
          if (target.on) {
            await persistDevice(target.id, { on: false });
            toast.success(`${label} → ${target.name} OFF`);
          } else {
            toast(`${label} → ${target.name} already off`);
          }
          break;
        case "INCREASE_LEVEL": {
          const step = target.type === "fan" ? 1 : 10;
          const newLevel = clampLevel(target, target.level + step);
          await persistDevice(target.id, { on: true, level: newLevel });
          toast.success(`${label} → ${target.name} ${target.type === "fan" ? "speed" : "brightness"} ${newLevel}`);
          break;
        }
        case "DECREASE_LEVEL": {
          const step = target.type === "fan" ? 1 : 10;
          const newLevel = clampLevel(target, target.level - step);
          await persistDevice(target.id, { level: newLevel });
          toast.success(`${label} → ${target.name} ${target.type === "fan" ? "speed" : "brightness"} ${newLevel}`);
          break;
        }
        case "SELECT_NEXT": {
          const idx = list.findIndex((d) => d.id === target.id);
          const nextIdx = (idx + 1) % list.length;
          setFocusedId(list[nextIdx].id);
          toast(`${label} → focus ${list[nextIdx].name}`);
          break;
        }
        case "SELECT_CONFIRM":
          toast(`${label} → ${target.name} selected`);
          break;
        default:
          break;
      }
      await recordEvent({ gesture, confidence, action, device: target });
    },
    [persistDevice, recordEvent]
  );

  const handleClearLog = useCallback(async () => {
    setEvents([]);
    try { await clearGestureEvents(); toast("Activity log cleared"); }
    catch (e) { console.error(e); }
  }, []);

  const handleResetDevices = useCallback(async () => {
    try {
      const fresh = await resetDevices();
      setDevices(fresh);
      if (fresh.length > 0) setFocusedId(fresh[0].id);
      toast.success("Devices reset to defaults");
    } catch (e) {
      toast.error("Failed to reset devices");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/10 pb-5 mb-6" data-testid="dashboard-header">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-[#FFB300] pulse-dot" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FFB300]">
                GESTURE.HMI / V1.0
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-medium leading-[0.95]">
              Smart Home<br />
              <span className="text-[#00E5FF]">Gesture Control</span>
            </h1>
            <p className="text-sm text-white/60 mt-3 max-w-xl">
              Computer-vision-driven appliance control. Wave a gesture, command your home — no remotes, no apps, no touch.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className={`inline-block w-2 h-2 rounded-full ${feedStatus.camera === "active" ? "bg-[#00E5FF] pulse-dot" : "bg-[#3F3F46]"}`} />
              <span className="text-white/70">CAMERA: {feedStatus.camera.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
              <span className={`inline-block w-2 h-2 rounded-full ${feedStatus.model === "ready" ? "bg-[#FFB300] pulse-dot" : "bg-[#3F3F46]"}`} />
              <span className="text-white/70">MODEL: {feedStatus.model.toUpperCase()}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                data-testid="pause-toggle-btn"
                className="flex items-center gap-2 px-3 py-2 border border-white/15 hover:border-white/40 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
              >
                {paused ? <Play className="w-3 h-3" strokeWidth={2} /> : <Pause className="w-3 h-3" strokeWidth={2} />}
                {paused ? "RESUME" : "PAUSE"}
              </button>
              <button
                type="button"
                onClick={handleResetDevices}
                data-testid="reset-devices-btn"
                className="flex items-center gap-2 px-3 py-2 border border-white/15 hover:border-white/40 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" strokeWidth={2} />
                RESET
              </button>
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* LEFT: webcam feed + activity */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="heading-label">[ 01 ] LIVE VISION INPUT</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1">
                  <Activity className="w-3 h-3" strokeWidth={2} /> 30 FPS
                </span>
              </div>
              <WebcamFeed
                onGesture={handleGesture}
                onStatusChange={setFeedStatus}
                paused={paused}
              />
            </div>

            <ActivityFeed events={events} onClear={handleClearLog} />
          </div>

          {/* RIGHT: devices + legend */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <DevicePanel
              devices={devices}
              focusedId={focusedId}
              onToggle={(d) => persistDevice(d.id, { on: !d.on })}
              onLevelChange={(d, v) => persistDevice(d.id, { level: v, on: true })}
              onFocus={(id) => setFocusedId(id)}
            />
            <GestureLegend activeGesture={activeGesture} />

            {focusedDevice && (
              <div className="border border-white/10 bg-[#0A0A0A] p-4 font-mono text-xs" data-testid="focus-summary">
                <div className="text-white/50 uppercase tracking-[0.2em] text-[10px] mb-2">SELECTED TARGET</div>
                <div className="text-[#00E5FF] text-base">{focusedDevice.name}</div>
                <div className="text-white/60 mt-1">
                  Status: <span className="text-white">{focusedDevice.on ? "ON" : "OFF"}</span> ·
                  Level: <span className="text-white">{focusedDevice.level}{focusedDevice.type === "fan" ? "/5" : "%"}</span>
                </div>
              </div>
            )}
          </div>

          {/* INFO SECTION FULL WIDTH */}
          <div className="lg:col-span-12 mt-2">
            <InfoSection />
          </div>
        </main>

        <footer className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          <span>GESTURE.HMI · BUILT FROM RESEARCH PAPER · 2026</span>
          <span>POWERED BY MEDIAPIPE HANDS · FASTAPI · MONGODB</span>
        </footer>
      </div>
    </div>
  );
}
