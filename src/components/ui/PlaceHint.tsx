"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Arrow {
  path: string;
  width: number;
  height: number;
}

const STROKE = 2;

/** Straight horizontal path from the right edge of the hint box to the avatar, in viewport pixels. */
function arrowFrom(hint: HTMLElement): Arrow {
  const text = hint.getBoundingClientRect();
  const viewerLeft = hint.closest("aside")!.getBoundingClientRect().right;
  const [x1, y] = [text.right, text.top + text.height / 2];
  const x2 = (viewerLeft + window.innerWidth) / 2 - 60;
  const path = `M ${x1} ${y} H ${x2}`;
  return { path, width: window.innerWidth, height: window.innerHeight };
}

function sameArrow(a: Arrow, b: Arrow) {
  return a.path === b.path && a.width === b.width && a.height === b.height;
}

/**
 * Invites the user to click the avatar, with an arrow from the panel to the avatar.
 * The arrow is portaled to the body, so a panel filter or transform cannot contain its fixed position.
 */
export default function PlaceHint() {
  const hint = useRef<HTMLParagraphElement>(null);
  const [arrow, setArrow] = useState<Arrow | null>(null);

  /* Follow the hint every frame: list edits, panel scroll and window resizes all move it. */
  useEffect(() => {
    let frame = 0;
    const follow = () => {
      const next = arrowFrom(hint.current!);
      setArrow((current) => (current && sameArrow(current, next) ? current : next));
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <p
        ref={hint}
        className="rounded-lg border-2 border-dashed border-white px-3 py-2.5 text-base leading-snug font-medium text-white"
      >
        Click on the avatar to place the texture
      </p>
      {arrow &&
        createPortal(
          <svg
            className="pointer-events-none fixed inset-0 z-10 animate-[fade-in_0.4s_ease-out]"
            width={arrow.width}
            height={arrow.height}
          >
            <defs>
              <marker
                id="place-hint-head"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 1 2 L 8 5 L 1 8" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            <path
              d={arrow.path}
              fill="none"
              stroke="white"
              strokeWidth={STROKE}
              strokeDasharray="4 3"
              markerEnd="url(#place-hint-head)"
              style={{ filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.6))" }}
            />
          </svg>,
        document.body,
      )}
    </>
  );
}
