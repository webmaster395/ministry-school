export default function ProgressRing({
  percentage,
  label,
  sublabel,
}: {
  percentage: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
          <circle cx="52" cy="52" r={radius} fill="none" stroke="#ece5d9" strokeWidth="9" />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="font-title absolute inset-0 flex items-center justify-center text-[22px] text-foreground">
          {clamped}%
        </div>
      </div>
      <div>
        <p className="text-[15px] font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-sm text-muted">{sublabel}</p>}
      </div>
    </div>
  );
}
