"use client";

import { useEffect, useRef } from "react";

/**
 * Behind sign-in: a stained blood film, drawn (not a photo, so no licence and a few
 * hundred bytes), blurred heavily and drifting slowly (decision 014). An off-white
 * (or graphite) veil keeps the form readable. Drawn once; the drift is a CSS
 * transform, so the GPU moves it without redrawing. Stops for reduced motion.
 */
export function StainBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) drawBloodFilm(context, canvas.width, canvas.height);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={960}
        height={640}
        className="stain-drift absolute -inset-[10%] h-[120%] w-[120%] blur-xl"
      />
      <div className="absolute inset-0 bg-veil" />
    </div>
  );
}

/** Same film every visit (seeded), so the page never looks random. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawBloodFilm(context: CanvasRenderingContext2D, width: number, height: number) {
  const css = getComputedStyle(document.documentElement);
  const colour = (name: string) => css.getPropertyValue(name).trim();
  const random = seeded(20261125);

  context.fillStyle = colour("--stain-plasma");
  context.fillRect(0, 0, width, height);

  // Red cells: pale centres (biconcave discs), packed but not overlapping much.
  for (let i = 0; i < 330; i++) {
    const x = random() * width;
    const y = random() * height;
    const r = 13 + random() * 5;
    const disc = context.createRadialGradient(x, y, r * 0.15, x, y, r);
    disc.addColorStop(0, colour("--stain-cell-centre"));
    disc.addColorStop(0.55, colour("--stain-cell-centre"));
    disc.addColorStop(1, colour("--stain-cell"));
    context.fillStyle = disc;
    context.beginPath();
    context.ellipse(x, y, r, r * (0.9 + random() * 0.1), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  // A few white cells: pale cytoplasm with a lobed nucleus.
  for (let i = 0; i < 4; i++) {
    const x = 80 + random() * (width - 160);
    const y = 80 + random() * (height - 160);
    context.fillStyle = colour("--stain-cytoplasm");
    context.beginPath();
    context.arc(x, y, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colour("--stain-nucleus");
    for (let lobe = 0; lobe < 3; lobe++) {
      context.beginPath();
      context.arc(x - 12 + lobe * 12, y + (random() - 0.5) * 10, 9 + random() * 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Platelets.
  context.fillStyle = colour("--stain-platelet");
  for (let i = 0; i < 40; i++) {
    context.beginPath();
    context.arc(random() * width, random() * height, 1.5 + random() * 1.5, 0, Math.PI * 2);
    context.fill();
  }
}
