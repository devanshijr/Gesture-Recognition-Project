import { Hand, Power, ChevronUp, ChevronDown, Pointer, PartyPopper } from "lucide-react";

const ITEMS = [
  { id: "open_palm", name: "OPEN PALM", action: "POWER ON", icon: Hand, color: "#00E5FF" },
  { id: "fist", name: "FIST", action: "POWER OFF", icon: Power, color: "#FF3B30" },
  { id: "thumbs_up", name: "THUMBS UP", action: "INCREASE", icon: ChevronUp, color: "#FFB300" },
  { id: "thumbs_down", name: "THUMBS DOWN", action: "DECREASE", icon: ChevronDown, color: "#FFB300" },
  { id: "peace", name: "PEACE", action: "NEXT DEVICE", icon: PartyPopper, color: "#A1A1AA" },
  { id: "point", name: "POINT", action: "CONFIRM", icon: Pointer, color: "#A1A1AA" },
];

export default function GestureLegend({ activeGesture }) {
  return (
    <section data-testid="gesture-legend">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="heading-label">[ 03 ] GESTURE MAPPING</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">HOLD 600MS</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = activeGesture === it.id;
          return (
            <div
              key={it.id}
              data-testid={`legend-${it.id}`}
              className={`p-3 border flex flex-col items-start gap-1.5 transition-all ${
                active
                  ? "bg-[#1A1A1A] border-[#00E5FF]/60 shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                  : "bg-[#121212] border-white/10"
              }`}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: active ? "#00E5FF" : it.color }}
                strokeWidth={active ? 2 : 1.5}
              />
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/80">{it.name}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">→ {it.action}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
