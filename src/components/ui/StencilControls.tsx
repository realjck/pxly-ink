"use client";

import { DEFAULT_TRANSFORM, isPlaced } from "@/lib/stencil";
import type { Limb, Stencil, StencilTransform } from "@/types";
import LimbPicker from "./LimbPicker";
import PlaceHint from "./PlaceHint";
import Slider from "./Slider";

interface Props {
  stencil: Stencil;
  onChange: (changes: Partial<Stencil>) => void;
  /** Wraps the stencil around a limb; missing until the avatar is loaded. */
  onWrap?: (limb: Limb) => void;
}

/**
 * Settings of the active stencil (lengths shown in cm), or a placement hint until it is placed.
 * Wrapped around a limb, the size is the image height and the rotation turns it around the limb.
 */
export default function StencilControls({ stencil, onChange, onWrap }: Props) {
  const { transform, limb } = stencil;
  const setTransform = (changes: Partial<StencilTransform>) =>
    onChange({ transform: { ...transform, ...changes } });
  const cm = (meters: number) => Math.round(meters * 100);

  if (!isPlaced(stencil)) {
    return (
      <section className="flex flex-col gap-3 border-t border-white/8 pt-4 text-sm">
        <PlaceHint />
        <LimbPicker onPick={onWrap} />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 border-t border-white/8 pt-4 text-sm">
      <LimbPicker active={limb} onPick={onWrap} />
      <Slider
        label={limb ? "Height" : "Size"}
        value={cm(transform.size)}
        min={2}
        max={100}
        step={1}
        unit=" cm"
        onChange={(value) => setTransform({ size: value / 100 })}
      />
      <Slider
        label={limb ? "Turn" : "Rotation"}
        value={transform.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(rotation) => setTransform({ rotation })}
      />
      {!limb && (
        <Slider
          label="Offset X"
          value={cm(transform.offsetX)}
          min={-20}
          max={20}
          step={1}
          unit=" cm"
          onChange={(value) => setTransform({ offsetX: value / 100 })}
        />
      )}
      <Slider
        label={limb ? "Offset along limb" : "Offset Y"}
        value={cm(transform.offsetY)}
        min={limb ? -40 : -20}
        max={limb ? 40 : 20}
        step={1}
        unit=" cm"
        onChange={(value) => setTransform({ offsetY: value / 100 })}
      />
      {!limb && (
        <label className="flex cursor-pointer items-center gap-2 text-ink/80">
          <input
            type="checkbox"
            className="cursor-pointer accent-skin"
            checked={stencil.projection}
            onChange={(event) => onChange({ projection: event.target.checked })}
          />
          Projection (instead of sticker)
        </label>
      )}
      <button
        onClick={() => (limb ? onWrap?.(limb) : onChange({ transform: DEFAULT_TRANSFORM }))}
        className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-ink/80 transition-colors hover:bg-white/10 hover:text-ink"
      >
        Reset adjustments
      </button>
    </section>
  );
}
