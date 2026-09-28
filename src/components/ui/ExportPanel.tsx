"use client";

import { useState } from "react";
import { SL_MAPS, type SlMap } from "@/lib/avatarGeometry";
import { BAKE_SIZES, type BakeSize } from "@/lib/bake";
import Slider from "./Slider";

interface Props {
  disabled: boolean;
  /** Opacity is 0..1. */
  onExport: (map: SlMap, opacity: number, size: BakeSize) => Promise<void>;
}

/** Resolves after the browser has painted the current state. */
function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

/** Export opacity, texture size and one export button per Second Life body texture. */
export default function ExportPanel({ disabled, onExport }: Props) {
  const [opacity, setOpacity] = useState(100);
  const [size, setSize] = useState<BakeSize>(BAKE_SIZES[0]);
  const [exporting, setExporting] = useState<SlMap | null>(null);

  /** Shows the exporting state before the bake blocks the main thread. */
  async function exportMap(map: SlMap) {
    setExporting(map);
    await nextPaint();
    try {
      await onExport(map, opacity / 100, size);
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="mt-auto flex flex-col gap-3 border-t border-white/8 pt-4 text-sm">
      <h2 className="font-medium">Export PNG</h2>
      <div className="flex items-center justify-between">
        Size
        <div role="radiogroup" aria-label="Texture size" className="well flex rounded-full p-0.5">
          {BAKE_SIZES.map((option) => (
            <button
              key={option}
              role="radio"
              aria-checked={option === size}
              onClick={() => setSize(option)}
              className={`cursor-pointer rounded-full px-2.5 py-0.5 tabular-nums transition-colors ${
                option === size ? "bg-white/12 text-ink" : "text-ink/55 hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <Slider label="Opacity" value={opacity} min={0} max={100} step={1} unit="%" onChange={setOpacity} />
      <div className="mt-2 flex gap-2">
        {SL_MAPS.map((map) => (
          <button
            key={map}
            disabled={disabled || exporting !== null}
            onClick={() => exportMap(map)}
            className={`flex-1 rounded-full bg-skin enabled:cursor-pointer px-2 py-1.5 font-medium text-zinc-900 capitalize shadow-[inset_0_1px_0_rgb(255_255_255/0.4)] transition-colors ${
              exporting === map
                ? "animate-pulse"
                : "hover:bg-[#e8cbb6] disabled:bg-white/5 disabled:text-ink/30 disabled:shadow-none"
            }`}
          >
            {exporting === map ? "Exporting…" : map}
          </button>
        ))}
      </div>
    </section>
  );
}
