"use client";

import { DEFAULT_TRANSFORM } from "@/lib/stencil";
import type { Stencil, StencilTransform } from "@/types";
import Slider from "./Slider";

interface Props {
  stencil: Stencil;
  onChange: (changes: Partial<Stencil>) => void;
}

/** Settings of the active stencil: mode and transform sliders (lengths shown in cm). */
export default function StencilControls({ stencil, onChange }: Props) {
  const { transform } = stencil;
  const setTransform = (changes: Partial<StencilTransform>) =>
    onChange({ transform: { ...transform, ...changes } });
  const cm = (meters: number) => Math.round(meters * 100);

  return (
    <section className="flex flex-col gap-3 border-t border-zinc-700 pt-3 text-sm">
      {!stencil.placement && <p className="text-zinc-400">Click on the avatar to place it.</p>}
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
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={stencil.projection}
          onChange={(event) => onChange({ projection: event.target.checked })}
        />
        Projection (instead of sticker)
      </label>
      <button
        onClick={() => onChange({ transform: DEFAULT_TRANSFORM })}
        className="rounded bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
      >
        Reset adjustments
      </button>
    </section>
  );
}
