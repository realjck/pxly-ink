"use client";

import type { KeyboardEvent } from "react";
import type { Limb } from "@/types";

interface Props {
  active?: Limb;
  onPick?: (limb: Limb) => void;
}

/** Body parts of the mannequin, facing the viewer: the avatar's right leg is on the left. */
const PARTS: { limb: Limb; label: string; shapes: string[] }[] = [
  { limb: "arms", label: "Arms", shapes: ["M8 30 h36 v10 h-36 z", "M76 30 h36 v10 h-36 z"] },
  { limb: "torso", label: "Torso", shapes: ["M46 27 h28 l-2 48 h-24 z"] },
  { limb: "rightLeg", label: "Right leg", shapes: ["M48 77 h11 v57 h-10 z"] },
  { limb: "leftLeg", label: "Left leg", shapes: ["M61 77 h11 l-1 57 h-10 z"] },
];

/** Mannequin whose limbs wrap the image all around them when clicked. */
export default function LimbPicker({ active, onPick }: Props) {
  const pick = (limb: Limb) => onPick?.(limb);
  const onKey = (limb: Limb) => (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    pick(limb);
  };

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 140" className="h-24 shrink-0" aria-label="Wrap around a limb">
        <circle cx="60" cy="14" r="10" className="fill-white/10" />
        {PARTS.map(({ limb, label, shapes }) => (
          <g
            key={limb}
            role="button"
            tabIndex={onPick ? 0 : -1}
            aria-label={label}
            aria-pressed={limb === active}
            aria-disabled={!onPick}
            onClick={() => pick(limb)}
            onKeyDown={onKey(limb)}
            className={`outline-none transition-colors ${onPick ? "cursor-pointer" : "cursor-not-allowed"} ${
              limb === active ? "fill-skin" : "fill-white/15 hover:fill-white/35 focus-visible:fill-white/35"
            }`}
          >
            <title>{label}</title>
            {shapes.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        ))}
      </svg>
      <p className="text-sm leading-snug text-ink/60">Or wrap it all around a limb</p>
    </div>
  );
}
