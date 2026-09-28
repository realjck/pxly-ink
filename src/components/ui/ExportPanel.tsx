"use client";

import { useState } from "react";
import { SL_MAPS, type SlMap } from "@/lib/avatarGeometry";
import Slider from "./Slider";

interface Props {
  disabled: boolean;
  /** Opacity is 0..1. */
  onExport: (map: SlMap, opacity: number) => void;
}

/** Export opacity and one export button per Second Life body texture. */
export default function ExportPanel({ disabled, onExport }: Props) {
  const [opacity, setOpacity] = useState(100);

  return (
    <section className="mt-auto flex flex-col gap-3 border-t border-zinc-700 pt-3 text-sm">
      <h2 className="font-medium">Export 1024×1024 PNG</h2>
      <Slider label="Opacity" value={opacity} min={0} max={100} step={1} unit="%" onChange={setOpacity} />
      <div className="flex gap-2">
        {SL_MAPS.map((map) => (
          <button
            key={map}
            disabled={disabled}
            onClick={() => onExport(map, opacity / 100)}
            className="flex-1 rounded bg-sky-600 px-2 py-1 capitalize hover:bg-sky-500 disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {map}
          </button>
        ))}
      </div>
    </section>
  );
}
