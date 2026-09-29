"use client";

import { useState, type DragEvent } from "react";
import { createStencil } from "@/lib/stencil";
import type { Stencil } from "@/types";

interface Props {
  onAdd: (stencils: Stencil[]) => void;
}

/** Converts dropped or picked files into stencils, keeping PNGs only. */
function toStencils(files: FileList): Promise<Stencil[]> {
  return Promise.all(
    Array.from(files)
      .filter((file) => file.type === "image/png")
      .map(createStencil),
  );
}

/** Drop zone and file picker for transparent PNG stencils. */
export default function StencilUploader({ onAdd }: Props) {
  const [hover, setHover] = useState(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setHover(false);
    toStencils(event.dataTransfer.files).then(onAdd);
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`flex h-24 cursor-pointer items-center justify-center rounded-[18px] border border-dashed bg-well text-center text-sm leading-relaxed transition-colors ${
        hover ? "border-skin bg-skin/10 text-skin" : "border-white/20 text-ink/70 hover:border-white/40 hover:text-ink"
      }`}
    >
      Drop PNG here
      <br />
      or click to browse
      <input
        type="file"
        accept="image/png"
        multiple
        className="hidden"
        onChange={(event) => {
          const input = event.target;
          if (input.files) toStencils(input.files).then(onAdd).finally(() => (input.value = ""));
        }}
      />
    </label>
  );
}
