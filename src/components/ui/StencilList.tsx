"use client";

import { useState } from "react";
import type { Stencil } from "@/types";

interface Props {
  stencils: Stencil[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
  onDelete: (id: string) => void;
}

/** Layer list, topmost layer first; drag a row onto another to take its slot. */
export default function StencilList({ stencils, activeId, onSelect, onMove, onDelete }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function endDrag() {
    setDraggedId(null);
    setOverId(null);
  }

  return (
    <ul className="flex flex-col gap-1">
      {stencils.toReversed().map((stencil) => (
        <li
          key={stencil.id}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            setDraggedId(stencil.id);
          }}
          onDragOver={(event) => {
            if (!draggedId) return;
            event.preventDefault();
            setOverId(stencil.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedId && draggedId !== stencil.id) onMove(draggedId, stencil.id);
            endDrag();
          }}
          onDragEnd={endDrag}
          className={`group flex items-center gap-1 rounded border ${
            overId === stencil.id && draggedId !== stencil.id ? "border-sky-400" : "border-transparent"
          } ${draggedId === stencil.id ? "opacity-40" : ""} ${
            stencil.id === activeId ? "bg-sky-500/30" : "hover:bg-zinc-700"
          }`}
        >
          <button
            onClick={() => onSelect(stencil.id)}
            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 p-1 text-left text-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL thumbnail */}
            <img
              src={stencil.url}
              alt=""
              draggable={false}
              className="h-10 w-10 shrink-0 rounded bg-[repeating-conic-gradient(#555_0_25%,#333_0_50%)] bg-[length:10px_10px] object-contain"
            />
            <span className="truncate">{stencil.name}</span>
          </button>
          <button
            onClick={() => onDelete(stencil.id)}
            aria-label={`Delete ${stencil.name}`}
            title="Delete layer"
            className="mr-1 rounded px-2 py-1 text-zinc-400 hover:bg-red-600 hover:text-white"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
