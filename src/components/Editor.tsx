"use client";

import { useState } from "react";
import type { Placement, Stencil } from "@/types";
import Viewer from "./Viewer";
import StencilControls from "./ui/StencilControls";
import StencilList from "./ui/StencilList";
import StencilUploader from "./ui/StencilUploader";

/** Top-level editor: holds stencil state, renders the 3D viewer and the UI panel. */
export default function Editor() {
  const [stencils, setStencils] = useState<Stencil[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = stencils.find((stencil) => stencil.id === activeId);

  function addStencils(added: Stencil[]) {
    if (added.length === 0) return;
    setStencils((current) => [...current, ...added]);
    setActiveId(added[added.length - 1].id);
  }

  function updateStencil(id: string, changes: Partial<Stencil>) {
    setStencils((current) =>
      current.map((stencil) => (stencil.id === id ? { ...stencil, ...changes } : stencil)),
    );
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto bg-zinc-900 p-3 text-zinc-100">
        <h1 className="font-semibold tracking-wide">PXLY INK</h1>
        <StencilUploader onAdd={addStencils} />
        <StencilList stencils={stencils} activeId={activeId} onSelect={setActiveId} />
        {active && (
          <StencilControls
            stencil={active}
            onChange={(changes) => updateStencil(active.id, changes)}
          />
        )}
      </aside>
      <div className="flex-1">
        <Viewer
          stencils={stencils}
          activeId={activeId}
          onPlace={(id: string, placement: Placement) => updateStencil(id, { placement })}
        />
      </div>
    </div>
  );
}
