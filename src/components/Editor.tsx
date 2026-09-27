"use client";

import { useState } from "react";
import type { Stencil } from "@/types";
import Viewer from "./Viewer";
import StencilList from "./ui/StencilList";
import StencilUploader from "./ui/StencilUploader";

/** Top-level editor: holds stencil state, renders the 3D viewer and the UI panel. */
export default function Editor() {
  const [stencils, setStencils] = useState<Stencil[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  function addStencils(added: Stencil[]) {
    if (added.length === 0) return;
    setStencils((current) => [...current, ...added]);
    setActiveId(added[added.length - 1].id);
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto bg-zinc-900 p-3 text-zinc-100">
        <h1 className="font-semibold tracking-wide">PXLY INK</h1>
        <StencilUploader onAdd={addStencils} />
        <StencilList stencils={stencils} activeId={activeId} onSelect={setActiveId} />
      </aside>
      <div className="flex-1">
        <Viewer />
      </div>
    </div>
  );
}
