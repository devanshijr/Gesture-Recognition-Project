import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

function fmtTime(d) {
  const date = new Date(d);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function ActivityFeed({ events, onClear }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [events.length]);

  return (
    <section className="flex flex-col" data-testid="activity-feed">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="heading-label">[ 04 ] ACTIVITY LOG</h2>
        <button
          type="button"
          onClick={onClear}
          data-testid="clear-activity-btn"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#FF3B30] transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          CLEAR
        </button>
      </div>
      <div
        ref={ref}
        className="border border-white/10 bg-[#0A0A0A] h-72 overflow-y-auto p-4 font-mono text-xs"
        data-testid="activity-feed-list"
      >
        {events.length === 0 && (
          <div className="text-white/30 italic">
            No commands yet. Show a gesture to your camera<span className="cursor-blink"></span>
          </div>
        )}
        {events.map((ev, i) => (
          <div
            key={ev.id || i}
            className="slide-in border-b border-white/5 py-1.5 flex items-start gap-3"
          >
            <span className="text-white/40 shrink-0">[{fmtTime(ev.timestamp)}]</span>
            <span className="text-[#00E5FF] shrink-0 uppercase">{ev.gesture}</span>
            <span className="text-white/40 shrink-0">→</span>
            <span className="text-[#FFB300] shrink-0 uppercase">{ev.action}</span>
            {ev.device_name && (
              <>
                <span className="text-white/40 shrink-0">::</span>
                <span className="text-white truncate">{ev.device_name}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
