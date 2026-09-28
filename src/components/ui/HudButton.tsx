"use client";

import { useRef, type PointerEvent, type KeyboardEvent, type ReactNode } from "react";

/** Seconds of motion applied by a tap or a key press. */
const TAP = 1 / 20;
/** Longest frame step, so a stalled frame does not jump the camera. */
const MAX_STEP = 1 / 20;

interface Props {
  label: string;
  /** Moves the camera for `seconds` of hold time. */
  step: (seconds: number) => void;
  children: ReactNode;
}

/** SVG button that repeats `step` every frame while held. */
export default function HudButton({ label, step, children }: Props) {
  const frame = useRef(0);

  function start(event: PointerEvent<SVGGElement>) {
    stop();
    event.currentTarget.setPointerCapture(event.pointerId);
    step(TAP);
    let last = performance.now();
    const loop = (now: number) => {
      step(Math.min((now - last) / 1000, MAX_STEP));
      last = now;
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(frame.current);
  }

  function press(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    step(TAP);
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="group cursor-pointer text-zinc-200/75 outline-none hover:text-skin active:text-white focus-visible:text-skin"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={stop}
      onKeyDown={press}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}
