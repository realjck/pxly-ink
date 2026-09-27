"use client";

import type { Stencil } from "@/types";

interface Props {
  stencils: Stencil[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Selectable list of uploaded stencils with thumbnails. */
export default function StencilList({ stencils, activeId, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-1">
      {stencils.map((stencil) => (
        <li key={stencil.id}>
          <button
            onClick={() => onSelect(stencil.id)}
            className={`flex w-full items-center gap-2 rounded p-1 text-left text-sm ${
              stencil.id === activeId ? "bg-sky-500/30" : "hover:bg-zinc-700"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL thumbnail */}
            <img
              src={stencil.url}
              alt=""
              className="h-10 w-10 rounded bg-[repeating-conic-gradient(#555_0_25%,#333_0_50%)] bg-[length:10px_10px] object-contain"
            />
            <span className="truncate">{stencil.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
