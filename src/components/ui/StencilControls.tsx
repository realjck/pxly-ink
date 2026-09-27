"use client";

import type { Stencil } from "@/types";

interface Props {
  stencil: Stencil;
  onChange: (changes: Partial<Stencil>) => void;
}

/** Settings of the active stencil. */
export default function StencilControls({ stencil, onChange }: Props) {
  return (
    <section className="flex flex-col gap-2 border-t border-zinc-700 pt-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={stencil.projection}
          onChange={(event) => onChange({ projection: event.target.checked })}
        />
        Projection (instead of sticker)
      </label>
      {!stencil.placement && <p className="text-zinc-400">Click on the avatar to place it.</p>}
    </section>
  );
}
