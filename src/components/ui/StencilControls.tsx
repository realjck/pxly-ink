"use client";

import { DEFAULT_TRANSFORM } from "@/lib/stencil";
import type { Stencil, StencilTransform } from "@/types";
import PlaceHint from "./PlaceHint";
import Slider from "./Slider";

interface Props {
  stencil: Stencil;
  onChange: (changes: Partial<Stencil>) => void;
}

/** Settings of the active stencil (lengths shown in cm), or a placement hint until it is placed. */
export default function StencilControls({ stencil, onChange }: Props) {
  const { transform } = stencil;
  const setTransform = (changes: Partial<StencilTransform>) =>
    onChange({ transform: { ...transform, ...changes } });
  const cm = (meters: number) => Math.round(meters * 100);

  if (!stencil.placement) {
    return (
      <section className="border-t border-white/8 pt-4 text-sm">
        <PlaceHint />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 border-t border-white/8 pt-4 text-sm">
      <Slider
        label="Size"
        value={cm(transform.size)}
        min={2}
        max={60}
        step={1}
        unit=" cm"
        onChange={(value) => setTransform({ size: value / 100 })}
      />
      <Slider
        label="Rotation"
        value={transform.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(rotation) => setTransform({ rotation })}
      />
      <Slider
        label="Offset X"
        value={cm(transform.offsetX)}
        min={-20}
        max={20}
        step={1}
        unit=" cm"
        onChange={(value) => setTransform({ offsetX: value / 100 })}
      />
      <Slider
        label="Offset Y"
        value={cm(transform.offsetY)}
        min={-20}
        max={20}
        step={1}
        unit=" cm"
        onChange={(value) => setTransform({ offsetY: value / 100 })}
      />
      <label className="flex items-center gap-2 text-ink/80">
        <input
          type="checkbox"
          className="accent-skin"
          checked={stencil.projection}
          onChange={(event) => onChange({ projection: event.target.checked })}
        />
        Projection (instead of sticker)
      </label>
      <button
        onClick={() => onChange({ transform: DEFAULT_TRANSFORM })}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-ink/80 transition-colors hover:bg-white/10 hover:text-ink"
      >
        Reset adjustments
      </button>
    </section>
  );
}
