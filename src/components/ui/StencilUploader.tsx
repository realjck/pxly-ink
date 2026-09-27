"use client";

import { useState, type DragEvent } from "react";
import type { Stencil } from "@/types";

interface Props {
  onAdd: (stencils: Stencil[]) => void;
}

/** Converts dropped or picked files into stencils, keeping PNGs only. */
function toStencils(files: FileList): Stencil[] {
  return Array.from(files)
    .filter((file) => file.type === "image/png")
    .map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      projection: false,
    }));
}

/** Drop zone and file picker for transparent PNG stencils. */
export default function StencilUploader({ onAdd }: Props) {
  const [hover, setHover] = useState(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setHover(false);
    onAdd(toStencils(event.dataTransfer.files));
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`flex h-24 cursor-pointer items-center justify-center rounded border-2 border-dashed text-center text-sm transition-colors ${
        hover ? "border-sky-400 bg-sky-400/10" : "border-zinc-600 hover:border-zinc-400"
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
          if (event.target.files) onAdd(toStencils(event.target.files));
          event.target.value = "";
        }}
      />
    </label>
  );
}
