"use client";

import { SL_MAPS, type SlMap } from "@/lib/avatarGeometry";

interface Props {
  disabled: boolean;
  onExport: (map: SlMap) => void;
}

/** One export button per Second Life body texture. */
export default function ExportPanel({ disabled, onExport }: Props) {
  return (
    <section className="mt-auto flex flex-col gap-2 border-t border-zinc-700 pt-3 text-sm">
      <h2 className="font-medium">Export 1024×1024 PNG</h2>
      <div className="flex gap-2">
        {SL_MAPS.map((map) => (
          <button
            key={map}
            disabled={disabled}
            onClick={() => onExport(map)}
            className="flex-1 rounded bg-sky-600 px-2 py-1 capitalize hover:bg-sky-500 disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {map}
          </button>
        ))}
      </div>
    </section>
  );
}
