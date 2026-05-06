import { Lightbulb, Fan, Power } from "lucide-react";
import { Slider } from "@/components/ui/slider";

function DeviceCard({ device, focused, onToggle, onLevelChange, onFocus }) {
  const Icon = device.type === "fan" ? Fan : Lightbulb;
  const max = device.type === "fan" ? 5 : 100;
  const min = device.type === "fan" ? 1 : 0;
  const step = device.type === "fan" ? 1 : 5;
  const unit = device.type === "fan" ? "" : "%";

  return (
    <button
      type="button"
      onClick={onFocus}
      data-testid={`device-card-${device.id}`}
      className={`relative w-full text-left p-5 border transition-all duration-200 ${
        focused
          ? "bg-[#1A1A1A] border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.15)]"
          : "bg-[#121212] border-white/10 hover:border-white/25"
      }`}
    >
      {focused && <div className="absolute top-0 left-0 w-1 h-full bg-[#00E5FF]" />}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 flex items-center justify-center border ${
              device.on
                ? "bg-[#FFB300]/15 border-[#FFB300]/50 text-[#FFB300]"
                : "bg-white/5 border-white/15 text-white/50"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${device.type === "fan" && device.on ? "animate-spin" : ""}`}
              style={{ animationDuration: device.type === "fan" && device.on ? `${2.5 - device.level * 0.3}s` : undefined }}
              strokeWidth={device.on ? 2 : 1.5}
            />
          </div>
          <div>
            <div className="font-heading text-base font-medium text-white">{device.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mt-0.5">
              {device.location} · {device.type}
            </div>
          </div>
        </div>

        <span
          data-testid={`device-status-${device.id}`}
          className={`font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border ${
            device.on
              ? "bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF]"
              : "bg-white/5 border-white/15 text-white/40"
          }`}
        >
          {device.on ? "● ONLINE" : "○ OFF"}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            {device.type === "fan" ? "SPEED" : "BRIGHTNESS"}
          </span>
          <span
            data-testid={`device-level-${device.id}`}
            className="font-mono text-sm text-white tabular-nums"
          >
            {device.level}{unit}{device.type === "fan" ? "/5" : ""}
          </span>
        </div>
        <Slider
          value={[device.level]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) => onLevelChange(v[0])}
          onClick={(e) => e.stopPropagation()}
          disabled={!device.on}
          data-testid={`device-slider-${device.id}`}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          data-testid={`device-toggle-${device.id}`}
          className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] border transition-colors ${
            device.on
              ? "bg-[#FFB300] text-black border-[#FFB300] hover:bg-[#FFC107]"
              : "bg-transparent text-white border-white/20 hover:border-white/50"
          }`}
        >
          <Power className="w-3 h-3" strokeWidth={2} />
          {device.on ? "TURN OFF" : "TURN ON"}
        </button>
      </div>
    </button>
  );
}

export default function DevicePanel({ devices, focusedId, onToggle, onLevelChange, onFocus }) {
  return (
    <section className="flex flex-col gap-3" data-testid="device-panel">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="heading-label">[ 02 ] APPLIANCES</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {devices.filter((d) => d.on).length}/{devices.length} ACTIVE
        </span>
      </div>
      {devices.map((d) => (
        <DeviceCard
          key={d.id}
          device={d}
          focused={focusedId === d.id}
          onToggle={() => onToggle(d)}
          onLevelChange={(v) => onLevelChange(d, v)}
          onFocus={() => onFocus(d.id)}
        />
      ))}
    </section>
  );
}
