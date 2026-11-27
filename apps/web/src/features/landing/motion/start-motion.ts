/**
 * Every landing animation, in one place (decisions 017, 018). Loaded on demand by
 * landing-motion.tsx, only when motion is on.
 *
 * - Entrances REPLAY each time a section comes back into view (enter from above or
 *   below), like the reference; they don't play once and freeze.
 * - Only transform, opacity, clip-path and SVG strokes move; never layout.
 * - Looping work pauses off screen; "Pause motion" reverts everything.
 */
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

type Cleanup = () => void;
const all = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(selector));

/** Play on arrival from either direction, every time. */
const replay = (trigger: Element, start = "top 85%"): ScrollTrigger.Vars => ({
  trigger,
  start,
  toggleActions: "restart none restart none",
});

export function startMotion(): Cleanup {
  const root = document.documentElement;

  // Smooth, weighted scrolling for mouse and trackpad; touch keeps native scrolling.
  const lenis = window.matchMedia("(pointer: fine)").matches
    ? new Lenis({ lerp: 0.1, autoRaf: false, anchors: { offset: -96 } })
    : null;
  const tick = (time: number) => lenis?.raf(time * 1000);
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  const cleanups: Cleanup[] = [];
  const ctx = gsap.context(() => {
    cleanups.push(
      heroFigure(),
      drops(),
      scramble(),
      lines(),
      fades(),
      counters(),
      morph(),
      critical(),
      delivery(),
    );
  });
  const media = gsap.matchMedia();
  media.add("(min-width: 1024px)", journeyPin);

  root.classList.add("motion-ready");
  // Triggers were created by kind, not page order; the pinned journey adds scroll
  // space above later sections, so sort top-to-bottom before measuring.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  // A deep link (/#safety) was scrolled to before the pin added its space above.
  // Chrome and Firefox keep the place (scroll anchoring); Safari doesn't, so go
  // back to the linked section now that the page has its final height.
  const linked = window.location.hash
    ? document.getElementById(window.location.hash.slice(1))
    : null;
  if (linked) linked.scrollIntoView({ block: "start" });

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
            { x: dx * 0.35, y: 26, duration: 0.2, ease: "power1.in" },
            { x: dx, y: 62, duration: 0.26, ease: "power2.in" },
            { opacity: 0, duration: 0.1 },
          ],
        },
        i * 0.06,
      );
    });
    return tl;
  };

  gsap.set(wrapper, { opacity: 1 });
  const intro = gsap.timeline({ delay: 0.3, defaults: { ease: "power3.out" } });
  intro
    .from(part("cap"), { y: -24, opacity: 0, duration: 0.5 })
    .from(
      part("liquid"),
      { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, ease: "power2.inOut" },
      "-=0.2",
    )
    .from(
      part("guide"),
      { scaleY: 0, transformOrigin: "50% 0%", duration: 0.5, stagger: 0.07 },
      "-=0.4",
    )
    .from(part("label"), { opacity: 0, y: 6, duration: 0.35, stagger: 0.07 }, "<")
    .from(part("base"), { opacity: 0, duration: 0.5 }, "<");
  rows.forEach((row) => {
    intro
      .add(fall(), ">-0.1")
      .from(
        row,
        { scaleX: 0, opacity: 0, transformOrigin: "0% 50%", duration: 0.32, stagger: 0.05 },
        ">-0.3",
      );
  });
  intro
    .from(part("check"), {
      opacity: 0,
      scale: 0,
      transformOrigin: "50% 50%",
      duration: 0.3,
      stagger: 0.03,
      ease: "back.out(2)",
    })
    .from(part("flag"), {
      opacity: 0,
      scale: 0.4,
      transformOrigin: "100% 50%",
      duration: 0.45,
      ease: "back.out(2.5)",
    });

  const idle = gsap.timeline({ repeat: -1, repeatDelay: 2.2, paused: true });
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

// ── Section headlines: every letter drops in, nearly together, every arrival ──
function drops(): Cleanup {
  for (const el of all("[data-drop]")) {
    gsap.set(el, { opacity: 1 });
    SplitText.create(el, {
      type: "words,chars",
      mask: "words",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: -115,
          opacity: 0,
          duration: 0.85,
          ease: "back.out(1.3)",
          stagger: { amount: 0.45, from: "random" },
          scrollTrigger: replay(el, "top 82%"),
        }),
    });
  }
  return () => {};
}

// ── Section labels decode from scrambled characters ──────────────────────────
function scramble(): Cleanup {
  for (const el of all("[data-scramble]")) {
    const text = el.textContent ?? "";
    gsap.to(el, {
      duration: 1.1,
      ease: "none",
      scrambleText: {
        text,
        chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/–",
        speed: 0.6,
        revealDelay: 0.25,
      },
      scrollTrigger: replay(el, "top 90%"),
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
          duration: 0.95,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: replay(el, "top 88%"),
        }),
    });
  }
  return () => {};
}

// ── Everything else rises softly, every arrival ─────────────────────────────
function fades(): Cleanup {
  for (const el of all("[data-reveal='fade']")) {
    gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: replay(el, "top 92%"),
      },
    );
  }
  return () => {};
}

// ── Figures count up, every arrival ────────────────────────────────────────
function counters(): Cleanup {
  const els = all("[data-count]");
  for (const el of els) {
    const end = Number(el.dataset.count);
    const state = { value: 0 };
    gsap.fromTo(
      state,
      { value: 0 },
      {
        value: end,
        duration: 1.5,
        ease: "power2.out",
        scrollTrigger: replay(el, "top 90%"),
        onUpdate: () => {
          el.textContent = String(Math.round(state.value));
        },
      },
    );
  }
  return () => els.forEach((el) => (el.textContent = el.dataset.count ?? ""));
}

// ── The dark section: full-bleed when you arrive, rounds and pulls in as you leave ──
function morph(): Cleanup {
  for (const el of all("[data-morph]")) {
    gsap.fromTo(
      el,
      { clipPath: "inset(0% 0% 0% 0% round 0px)" },
      {
        clipPath: "inset(0% 2.5% 5% 2.5% round 56px)",
        ease: "none",
        scrollTrigger: { trigger: el, start: "bottom 95%", end: "bottom 25%", scrub: true },
      },
    );
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
  const reading = { value: 4.1 };

  const tl = gsap.timeline({ paused: true });
  tl.call(() => {
    reading.value = 4.1;
    value.textContent = "4.1";
    value.dataset.state = "normal";
  })
    .set(flag, { opacity: 0, scale: 0.6 })
    .set(path, { strokeDashoffset: 1 })
    .set(steps, { opacity: 0, x: -12 })
    .to(reading, {
      value: 6.8,
      duration: 1.3,
      ease: "power2.inOut",
      onUpdate: () => {
        value.textContent = reading.value.toFixed(1);
        value.dataset.state = reading.value >= 6.5 ? "critical" : "normal";
      },
    })
    .to(flag, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" })
    .to(path, { strokeDashoffset: 0, duration: 2.2, ease: "none" }, "+=0.15")
    .to(steps, { opacity: 1, x: 0, duration: 0.45, stagger: 0.55, ease: "power3.out" }, "<");

  ScrollTrigger.create({
    trigger: box,
    start: "top 75%",
    onEnter: () => void tl.restart(),
    onEnterBack: () => void tl.restart(),
  });
  return () => {
    value.textContent = final;
    value.dataset.state = "critical";
  };
}

// ── Delivery: the message arrives, the lab types, the result slip slides up ──
function delivery(): Cleanup {
  const phone = document.querySelector<HTMLElement>("[data-delivery]");
  if (!phone) return () => {};
  const message = phone.querySelector("[data-delivery-message]");
  const typing = phone.querySelector("[data-delivery-typing]");
  const slip = phone.querySelector("[data-delivery-slip]");
  const rows = all("[data-delivery-row]", phone);
  const dots = typing ? all("span", typing) : [];

  const tl = gsap.timeline({ paused: true });
  tl.set([message, typing, slip], { opacity: 0 })
    .fromTo(phone, { y: 40, rotate: -2 }, { y: 0, rotate: 0, duration: 0.9, ease: "power3.out" })
    .fromTo(
      message,
      { opacity: 0, scale: 0.85, transformOrigin: "0% 0%" },
      { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" },
      "-=0.3",
    )
    .to(typing, { opacity: 1, duration: 0.2 }, "+=0.3")
    .fromTo(
      dots,
      { y: 0 },
      { y: -5, duration: 0.25, yoyo: true, repeat: 3, stagger: 0.1, ease: "power1.inOut" },
    )
    .to(typing, { opacity: 0, duration: 0.2 })
    .fromTo(slip, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
    .fromTo(
      rows,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.12 },
      "-=0.25",
    );

  ScrollTrigger.create({
    trigger: phone,
    start: "top 75%",
    onEnter: () => void tl.restart(),
    onEnterBack: () => void tl.restart(),
  });
  return () => {};
}

// ── Journey (desktop): a short hold while the sample travels the track ─────
function journeyPin(): Cleanup {
  const section = document.querySelector<HTMLElement>("[data-journey]");
  if (!section) return () => {};
  const steps = all("[data-journey-step]", section);
  const stations = all<SVGGElement>("[data-station]", section);
  const tube = section.querySelector<SVGGElement>("[data-journey-tube]");
  const bar = section.querySelector<SVGLineElement>("[data-journey-bar]");
  const counter = section.querySelector<HTMLElement>("[data-journey-counter]");
  const title = section.querySelector<HTMLElement>("[data-journey-title]");
  const text = section.querySelector<HTMLElement>("[data-journey-text]");
  const total = steps.length;
  const track = 520; // station 1 → station 5, in the SVG's units
  const pad = (n: number) => String(n).padStart(2, "0");
  let current = -1;

  const show = (index: number) => {
    if (index === current) return;
    current = index;
    stations.forEach((station, i) => station.setAttribute("data-on", String(i <= index)));
    if (counter) counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    const step = steps[index];
    if (title && text && step) {
      title.textContent = step.dataset.title ?? "";
      text.textContent = step.dataset.text ?? "";
      gsap.fromTo(
        [title, text],
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power3.out", overwrite: true },
      );
    }
  };
  show(0);
  if (bar) gsap.set(bar, { scaleX: 0, transformOrigin: "40px 60px" });

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: () => `+=${window.innerHeight * 1.8}`,
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => {
      const p = self.progress;
      if (tube) gsap.set(tube, { x: p * track });
      if (bar) gsap.set(bar, { scaleX: p });
      show(Math.min(total - 1, Math.round(p * (total - 1))));
    },
  });
  return () => stations.forEach((station) => station.removeAttribute("data-on"));
}
