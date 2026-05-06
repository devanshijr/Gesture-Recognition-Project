import { Cpu, Eye, Network, Sparkles } from "lucide-react";

const FACTS = [
  { icon: Eye, label: "CV PIPELINE", value: "MediaPipe Hands + 21 landmarks" },
  { icon: Cpu, label: "CLASSIFIER", value: "Geometric ruleset · CNN-validated" },
  { icon: Network, label: "TARGETS", value: "Smart appliances via IoT bridge" },
  { icon: Sparkles, label: "PAPER ACCURACY", value: "96.4% (CNN > SVM > RF)" },
];

export default function InfoSection() {
  return (
    <section
      className="border border-white/10 bg-[#121212] p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8"
      data-testid="info-section"
    >
      <div>
        <h2 className="heading-label mb-3">[ 05 ] ABOUT THE SYSTEM</h2>
        <h3 className="font-heading text-2xl md:text-3xl tracking-tight font-medium text-white mb-3">
          Gesture Recognition for Smart Home Appliances
        </h3>
        <p className="text-sm leading-relaxed text-white/70 mb-3">
          Implementation companion of the research paper <em>"An Intelligent Human-Machine Interaction System"</em>.
          The pipeline acquires live video, performs preprocessing (HSV, Gaussian blur, segmentation),
          extracts hand contours and landmarks, classifies a gesture, then dispatches the corresponding
          IoT control command — fully contactless interaction with your home.
        </p>
        <p className="text-sm leading-relaxed text-white/70">
          This demo runs the entire vision stack <span className="text-[#00E5FF]">in your browser</span> using MediaPipe
          Hands. Backend persists device state and gesture history in MongoDB.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FACTS.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="border border-white/10 p-4 bg-[#0A0A0A]">
              <Icon className="w-5 h-5 text-[#FFB300] mb-3" strokeWidth={1.5} />
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">{f.label}</div>
              <div className="text-sm text-white">{f.value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
