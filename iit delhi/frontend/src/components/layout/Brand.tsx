export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Crisp SVG Sahara Sun & Wave Emblem */}
      <div
        className={`relative shrink-0 grid place-items-center rounded-full bg-gradient-to-b from-[#e6a62d] to-[#d48818] p-[2px] shadow-sm ${
          compact ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Background circle */}
          <circle cx="18" cy="18" r="17" fill="#fffdf8" />

          {/* Radiant Sun Rays */}
          <g stroke="#e6a62d" strokeWidth="1.6" strokeLinecap="round">
            <line x1="18" y1="5" x2="18" y2="8" />
            <line x1="18" y1="28" x2="18" y2="31" opacity="0.3" />
            <line x1="5" y1="18" x2="8" y2="18" />
            <line x1="28" y1="18" x2="31" y2="18" />
            <line x1="8.8" y1="8.8" x2="11" y2="11" />
            <line x1="25" y1="25" x2="27.2" y2="27.2" opacity="0.3" />
            <line x1="27.2" y1="8.8" x2="25" y2="11" />
            <line x1="11" y1="25" x2="8.8" y2="27.2" opacity="0.3" />
          </g>

          {/* Golden Sun Body */}
          <circle cx="18" cy="15" r="5.5" fill="#e6a62d" />

          {/* Deep Navy Water / Land Waves */}
          <path
            d="M6 21.5C9.5 19.5 13.5 22.5 18 21.5C22.5 20.5 26.5 23.5 30 21.5"
            stroke="#17324d"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 25.5C11.5 23.8 15 26 18 25.5C21 25 24.5 27 28 25.5"
            stroke="#17324d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div>
        <div className="text-[13px] font-extrabold tracking-[.14em] uppercase text-[#17324d] leading-none">
          Sahara
        </div>
        {!compact && (
          <div className="text-[9.5px] font-bold tracking-[.18em] uppercase text-[#8b7c68] mt-0.5 leading-none">
            Finance
          </div>
        )}
      </div>
    </div>
  );
}
