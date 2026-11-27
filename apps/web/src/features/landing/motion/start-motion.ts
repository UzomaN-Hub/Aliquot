/**
 * Every landing animation, in one place (decision 017). Loaded on demand by
 * landing-motion.tsx, only when motion is on.
 *
 * Rules that keep it smooth on a mid-range phone:
 * - Only transform, opacity, clip-path and SVG strokes move; never layout.
 * - Text is split once (SplitText re-splits only on resize or font load).
 * - Looping work pauses when off screen; nothing runs after "Pause motion".
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText);

type Cleanup = () => void;
const all = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(selector));

export function startMotion(): Cleanup {
  const root = document.documentElement;

  // Smooth, weighted scrolling with a mouse or trackpad. Touch keeps the phone's own
  // native scrolling, which people's thumbs already trust.
  const lenis = window.matchMedia("(pointer: fine)").matches
    ? new Lenis({ lerp: 0.11, autoRaf: false, anchors: { offset: -88 } })
    : null;
  const tick = (time: number) => lenis?.raf(time * 1000);
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  const cleanups: Cleanup[] = [];
  const ctx = gsap.context(() => {
    cleanups.push(heroFigure(), chars(), lines(), fades(), counters(), morph(), critical());
  });
  const media = gsap.matchMedia();
  media.add("(min-width: 1024px)", journeyPin);

  root.classList.add("motion-ready");
  ScrollTrigger.refresh();

  return () => {
    media.revert();
    ctx.revert();
    cleanups.forEach((cleanup) => cleanup());
    if (lenis) {
      gsap.ticker.remove(tick);
      lenis.destroy();
    }
    root.classList.remove("motion-ready");
  };
}

// ── Hero figure: the tube fills, aliquots fall, results stack, then it breathes ──
function heroFigure(): Cleanup {
  const svg = document.querySelector<SVGSVGElement>("[data-aliquot]");
  const wrapper = document.querySelector<HTMLElement>("[data-hero-figure]");
  if (!svg || !wrapper) return () => {};
  const part = (name: string) => all<SVGElement>(`[data-a='${name}']`, svg);
  const drops = part("drop");
  const tiles = part("tile");
  const rows = [0, 1, 2, 3].map((row) => tiles.filter((tile) => tile.dataset.row === String(row)));

  const fall = () => {
    const tl = gsap.timeline();
    drops.forEach((drop, i) => {
      const dx = Number(drop.dataset.x) - 260;
      tl.fromTo(
        drop,
        { opacity: 1, x: 0, y: 0 },
        {
          keyframes: [
            { x: dx * 0.35, y: 26, duration: 0.22, ease: "power1.in" },
            { x: dx, y: 62, duration: 0.3, ease: "power2.in" },
            { opacity: 0, duration: 0.12 },
          ],
        },
        i * 0.07,
      );
    });
    return tl;
  };

  gsap.set(wrapper, { opacity: 1 });
  const intro = gsap.timeline({ delay: 0.4, defaults: { ease: "power3.out" } });
  intro
    .from(part("cap"), { y: -24, opacity: 0, duration: 0.6 })
    .from(
      part("liquid"),
      { scaleY: 0, transformOrigin: "50% 100%", duration: 1.1, ease: "power2.inOut" },
      "-=0.2",
    )
    .from(
      part("guide"),
      { scaleY: 0, transformOrigin: "50% 0%", duration: 0.6, stagger: 0.08 },
      "-=0.4",
    )
    .from(part("label"), { opacity: 0, y: 6, duration: 0.4, stagger: 0.08 }, "<")
    .from(part("base"), { opacity: 0, duration: 0.6 }, "<");
  rows.forEach((row) => {
    intro
      .add(fall(), ">-0.1")
      .from(
        row,
        { scaleX: 0, opacity: 0, transformOrigin: "0% 50%", duration: 0.45, stagger: 0.06 },
        ">-0.2",
      );
  });
  intro
    .from(part("check"), {
      opacity: 0,
      scale: 0,
      transformOrigin: "50% 50%",
      duration: 0.35,
      stagger: 0.04,
      ease: "back.out(2)",
    })
    .from(part("flag"), {
      opacity: 0,
      scale: 0.4,
      transformOrigin: "100% 50%",
      duration: 0.5,
      ease: "back.out(2.5)",
    });

  // Afterwards, a quiet loop: the level dips, three more portions fall, the newest
  // results pulse. Paused whenever the hero is off screen.
  const idle = gsap.timeline({ repeat: -1, repeatDelay: 2.4, paused: true });
  idle
    .to(part("liquid"), {
      scaleY: 0.82,
      transformOrigin: "50% 100%",
      duration: 0.6,
      ease: "power2.inOut",
    })
    .add(fall(), "<0.2")
    .to(
      rows[3] ?? [],
      { opacity: 0.55, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.05 },
      "-=0.15",
    )
    .to(part("liquid"), { scaleY: 1, duration: 1, ease: "power2.inOut" }, "<");

  let visible = true;
  intro.eventCallback("onComplete", () => visible && idle.play());
  ScrollTrigger.create({
    trigger: svg,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      visible = self.isActive;
      if (intro.progress() === 1) {
        if (visible) idle.play();
        else idle.pause();
      }
    },
  });
  return () => idle.kill();
}

// ── Section headlines: letters arrive one by one ────────────────────────────
function chars(): Cleanup {
  for (const el of all("[data-split='chars']")) {
    gsap.set(el, { opacity: 1 });
    SplitText.create(el, {
      type: "words,chars",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          opacity: 0,
          yPercent: 55,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.016,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }),
    });
  }
  return () => {};
}

// ── Paragraphs: each line rises out of its own mask ─────────────────────────
function lines(): Cleanup {
  for (const el of all("[data-split='words']")) {
    gsap.set(el, { opacity: 1 });
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 105,
          duration: 1,
          ease: "power4.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }),
    });
  }
  return () => {};
}

// ── Everything else rises softly, in small batches ─────────────────────────
function fades(): Cleanup {
  const targets = all("[data-reveal='fade']");
  gsap.set(targets, { opacity: 0, y: 28 });
  ScrollTrigger.batch(targets, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        overwrite: true,
      }),
  });
  return () => {};
}

// ── Figures count up the first time they're seen ───────────────────────────
function counters(): Cleanup {
  const els = all("[data-count]");
  for (const el of els) {
    const end = Number(el.dataset.count);
    const state = { value: 0 };
    el.textContent = "0";
    gsap.to(state, {
      value: end,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(state.value));
      },
    });
  }
  return () => els.forEach((el) => (el.textContent = el.dataset.count ?? ""));
}

// ── The dark section: a rounded inset frame that opens, then closes again ──
function morph(): Cleanup {
  for (const el of all("[data-morph]")) {
    gsap.fromTo(
      el,
      { clipPath: "inset(3% 3% 0% 3% round 40px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "top 15%", scrub: true },
      },
    );
    gsap.to(el, {
      clipPath: "inset(0% 3% 3% 3% round 40px)",
      ease: "none",
      immediateRender: false,
      scrollTrigger: { trigger: el, start: "bottom 85%", end: "bottom top", scrub: true },
    });
  }
  return () => {};
}

// ── Critical demo: value climbs, turns Eosin, the escalation line draws ────
function critical(): Cleanup {
  const box = document.querySelector<HTMLElement>("[data-critical]");
  const value = box?.querySelector<HTMLElement>("[data-critical-value]");
  const flag = box?.querySelector<HTMLElement>("[data-critical-flag]");
  const path = box?.querySelector<SVGPathElement>("[data-draw]");
  if (!box || !value || !flag || !path) return () => {};
  const steps = all("[data-critical-step]", box);
  const final = value.textContent ?? "";

  value.textContent = "4.1";
  value.dataset.state = "normal";
  const reading = { value: 4.1 };
  gsap.set(flag, { opacity: 0, scale: 0.6 });
  gsap.set(path, { strokeDashoffset: 1 });
  gsap.set(steps, { opacity: 0, x: -12 });
  const tl = gsap.timeline({ paused: true });
  tl.to(reading, {
    value: 6.8,
    duration: 1.4,
    ease: "power2.inOut",
    onUpdate: () => {
      value.textContent = reading.value.toFixed(1);
      value.dataset.state = reading.value >= 6.5 ? "critical" : "normal";
    },
  })
    .to(flag, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" })
    .to(path, { strokeDashoffset: 0, duration: 2.4, ease: "none" }, "+=0.2")
    .to(steps, { opacity: 1, x: 0, duration: 0.5, stagger: 0.6, ease: "power3.out" }, "<");

  ScrollTrigger.create({
    trigger: box,
    start: "top 70%",
    once: true,
    onEnter: () => void tl.play(),
  });
  return () => {
    value.textContent = final;
    value.dataset.state = "critical";
  };
}

// ── Journey (desktop): the section holds while scrolling walks the steps ───
function journeyPin(): Cleanup {
  const section = document.querySelector<HTMLElement>("[data-journey]");
  if (!section) return () => {};
  const steps = all("[data-journey-step]", section);
  const counter = section.querySelector<HTMLElement>("[data-journey-counter]");
  const title = section.querySelector<HTMLElement>("[data-journey-title]");
  const bar = section.querySelector<HTMLElement>("[data-journey-bar]");
  const total = steps.length;
  const pad = (n: number) => String(n).padStart(2, "0");
  let current = -1;

  const show = (index: number) => {
    if (index === current) return;
    current = index;
    steps.forEach((step, i) => (step.dataset.active = String(i === index)));
    if (counter) counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    if (title) {
      title.textContent = steps[index]?.dataset.title ?? "";
      gsap.fromTo(
        title,
        { yPercent: 35, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
      );
    }
  };
  show(0);

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => `+=${window.innerHeight * (total - 0.4)}`,
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      show(Math.min(total - 1, Math.floor(self.progress * total)));
      if (bar) gsap.set(bar, { scaleY: self.progress });
    },
  });
  return () => steps.forEach((step) => delete step.dataset.active);
}
