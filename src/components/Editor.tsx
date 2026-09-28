"use client";

import { useState } from "react";
import type { Mesh } from "three";
import { exportMap } from "@/lib/exportMap";
import { moveStencil } from "@/lib/stencil";
import type { Placement, Stencil } from "@/types";
import Viewer from "./Viewer";
import ExportPanel from "./ui/ExportPanel";
import StencilControls from "./ui/StencilControls";
import StencilList from "./ui/StencilList";
import StencilUploader from "./ui/StencilUploader";

/** Top-level editor: holds stencil state, renders the 3D viewer and the UI panel. */
export default function Editor() {
  const [stencils, setStencils] = useState<Stencil[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<Mesh | null>(null);
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

  function deleteStencil(id: string) {
    URL.revokeObjectURL(stencils.find((stencil) => stencil.id === id)!.url);
    setStencils((current) => current.filter((stencil) => stencil.id !== id));
    if (id === activeId) setActiveId(null);
  }

  return (
    <div className="flex h-screen w-screen">
      <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto bg-zinc-900 p-3 text-zinc-100">
        <h1 className="font-semibold tracking-wide">PXLY INK</h1>
        <StencilUploader onAdd={addStencils} />
        <StencilList
          stencils={stencils}
          activeId={activeId}
          onSelect={setActiveId}
          onMove={(fromId, toId) => setStencils((current) => moveStencil(current, fromId, toId))}
          onDelete={deleteStencil}
        />
        {active && (
          <StencilControls
            stencil={active}
            onChange={(changes) => updateStencil(active.id, changes)}
          />
        )}
        <ExportPanel
          disabled={!avatar || !stencils.some((stencil) => stencil.placement)}
          onExport={(map, opacity) => avatar && exportMap(avatar, stencils, map, opacity)}
        />
      </aside>
      {/* min-w-0: let the viewer shrink below the canvas size R3F last set. */}
      <div className="min-w-0 flex-1">
        <Viewer
          avatar={avatar}
          onAvatarLoad={setAvatar}
          stencils={stencils}
          activeId={activeId}
          onPlace={(id: string, placement: Placement) => updateStencil(id, { placement })}
        />
      </div>
    </div>
  );
}
