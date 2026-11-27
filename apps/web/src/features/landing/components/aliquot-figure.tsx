/**
 * The hero figure: one sample tube, portions (aliquots) falling into three lanes
 * (Chemical Pathology, Haematology, Microbiology), verified results stacking up.
 * Pure SVG in token colours; start-motion.ts animates it by its data-a attributes.
 * Without motion it shows the finished picture.
 */
const LANES = [
  { x: 100, label: "Chem path" },
  { x: 260, label: "Haem" },
  { x: 420, label: "Micro" },
] as const;
const ROWS = [486, 450, 414, 378] as const; // bottom row first
const TILE = { w: 124, h: 28 } as const;

// Result widths per lane/row, so the stack reads as real values, not stripes.
const VALUE_WIDTHS = [
  [46, 30, 52, 38],
  [40, 54, 34, 46],
  [56, 36, 44, 30],
] as const;

export function AliquotFigure() {
  return (
    <svg
      data-aliquot
      viewBox="0 0 520 560"
      role="img"
      aria-labelledby="aliquot-figure-title"
      className="h-auto w-full overflow-visible"
    >
      <title id="aliquot-figure-title">
        A sample tube divided into portions for three lab sections, each building a stack of
        verified results
      </title>

      {/* Tube */}
      <defs>
        <clipPath id="tube-inside">
          <rect x="240" y="44" width="40" height="126" rx="20" />
        </clipPath>
      </defs>
      <rect data-a="cap" x="228" y="16" width="64" height="22" rx="3" className="fill-primary" />
      <rect
        x="236"
        y="38"
        width="48"
        height="136"
        rx="24"
        className="fill-surface-raised stroke-ink"
        strokeWidth="2"
      />
      <g clipPath="url(#tube-inside)">
        <rect data-a="liquid" x="240" y="78" width="40" height="92" className="fill-eosin" />
      </g>

      {/* Drops, one per lane, start at the tube's tip */}
      {LANES.map((lane, i) => (
        <circle
          key={lane.label}
          data-a="drop"
          data-lane={i}
          data-x={lane.x}
          cx="260"
          cy="182"
          r="7"
          className="fill-eosin"
          opacity="0"
        />
      ))}

      {/* Lanes */}
      {LANES.map((lane, i) => (
        <g key={lane.label}>
          <text
            data-a="label"
            x={lane.x}
            y="236"
            textAnchor="middle"
            className="fill-ink-muted font-mono text-[13px]"
          >
            {lane.label}
          </text>
          <line
            data-a="guide"
            x1={lane.x}
            y1="252"
            x2={lane.x}
            y2="356"
            className="stroke-ink-faint"
            strokeWidth="1.5"
            strokeDasharray="3 6"
          />
          {ROWS.map((y, row) => {
            const critical = i === 0 && row === ROWS.length - 1;
            return (
              <g key={y} data-a="tile" data-row={row}>
                <rect
                  x={lane.x - TILE.w / 2}
                  y={y}
                  width={TILE.w}
                  height={TILE.h}
                  rx="2"
                  className={
                    critical
                      ? "fill-surface-raised stroke-eosin"
                      : "fill-surface-raised stroke-hairline"
                  }
                  strokeWidth={critical ? 1.5 : 1}
                />
                <rect
                  x={lane.x - TILE.w / 2 + 10}
                  y={y + 11}
                  width={VALUE_WIDTHS[i]?.[row] ?? 40}
                  height="6"
                  rx="1"
                  className={critical ? "fill-eosin" : "fill-ink-secondary"}
                />
                {critical ? (
                  <text
                    data-a="flag"
                    x={lane.x + TILE.w / 2 - 12}
                    y={y + 19}
                    textAnchor="end"
                    className="fill-eosin-text font-mono text-[12px] font-semibold"
                  >
                    CH↑
                  </text>
                ) : (
                  <path
                    data-a="check"
                    d={`M ${lane.x + 38} ${y + 14} l 5 5 l 10 -10`}
                    className="stroke-primary"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}

      {/* Base: everything ends verified and released */}
      <line
        data-a="base"
        x1="30"
        y1="530"
        x2="490"
        y2="530"
        className="stroke-ink"
        strokeWidth="1.5"
      />
      <text
        data-a="base"
        x="260"
        y="552"
        textAnchor="middle"
        className="fill-ink-muted font-mono text-[13px]"
      >
        verified · released
      </text>
    </svg>
  );
}
