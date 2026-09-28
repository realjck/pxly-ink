"use client";

import type { RefObject } from "react";
import type { OrbitControls } from "three-stdlib";
import { orbit, pan, zoom } from "@/lib/cameraNav";
import HudButton from "./HudButton";

/** Radians per second. */
const ORBIT_SPEED = 1.6;
/** Viewing distances per second. */
const PAN_SPEED = 0.5;
/** Distance factor per second when zooming in. */
const ZOOM_IN_RATE = 0.4;

const ORB = { x: 190, y: 74, r: 40 };
const PAD = { x: 66, y: 102 };
const RAIL = { x: 314, y: 102 };

interface Props {
  controls: RefObject<OrbitControls | null>;
  onReset: () => void;
}

/** Hit area behind a HUD icon, lit on hover, press and keyboard focus. */
function Hit({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      className="fill-white/0 stroke-transparent stroke-[1.2] transition-colors group-hover:fill-white/6 group-focus-visible:stroke-skin group-active:fill-skin/25"
    />
  );
}

/** Glass sphere with a tilted wireframe, specular highlight and a skin-toned glow. */
function Orb() {
  const { x, y, r } = ORB;
  return (
    <g className="pointer-events-none">
      <defs>
        <radialGradient id="hud-orb-fill" cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="0.5" stopColor="#c9d0dc" stopOpacity="0.07" />
          <stop offset="0.88" stopColor="#0d0d10" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </radialGradient>
        <radialGradient id="hud-orb-glow" cx="50%" cy="92%" r="55%">
          <stop offset="0" stopColor="#d9b8a0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#d9b8a0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hud-orb-spec" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hud-orb-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#d9b8a0" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id="hud-orb-clip">
          <circle cx={x} cy={y} r={r} />
        </clipPath>
        <filter id="hud-blur" x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse cx={x} cy={y + r + 10} rx={26} ry={4} fill="#000" opacity="0.55" filter="url(#hud-blur)" />
      <circle cx={x} cy={y} r={r} fill="url(#hud-orb-fill)" />
      <circle cx={x} cy={y} r={r} fill="url(#hud-orb-glow)" />
      <g clipPath="url(#hud-orb-clip)" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.8">
        <g transform={`rotate(-18 ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx={r * 0.72} ry={r} />
          <ellipse cx={x} cy={y} rx={r * 0.32} ry={r} />
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.26} strokeOpacity="0.28" />
          <ellipse cx={x} cy={y - r * 0.5} rx={r * 0.87} ry={r * 0.2} />
          <ellipse cx={x} cy={y + r * 0.5} rx={r * 0.87} ry={r * 0.2} />
        </g>
      </g>
      <circle cx={x} cy={y} r={r - 0.5} fill="none" stroke="url(#hud-orb-rim)" strokeWidth="1.2" />
      <ellipse
        cx={x - 14}
        cy={y - 17}
        rx={13}
        ry={6.5}
        fill="url(#hud-orb-spec)"
        transform={`rotate(-35 ${x - 14} ${y - 17})`}
      />
    </g>
  );
}

/** Orbit rings around the orb: back halves behind it, front halves over it. */
function Rings({ front }: { front: boolean }) {
  const { x, y } = ORB;
  const [h, v] = [{ rx: 58, ry: 15 }, { rx: 15, ry: 54 }];
  const style = front
    ? { stroke: "#e8e4df", strokeOpacity: 0.55, strokeWidth: 1.3 }
    : { stroke: "#e8e4df", strokeOpacity: 0.18, strokeWidth: 1, strokeDasharray: "2 3" };
  const horizontal = front
    ? `M ${x - h.rx} ${y} A ${h.rx} ${h.ry} 0 0 0 ${x + h.rx} ${y}`
    : `M ${x - h.rx} ${y} A ${h.rx} ${h.ry} 0 0 1 ${x + h.rx} ${y}`;
  const vertical = front
    ? `M ${x} ${y - v.ry} A ${v.rx} ${v.ry} 0 0 1 ${x} ${y + v.ry}`
    : `M ${x} ${y - v.ry} A ${v.rx} ${v.ry} 0 0 0 ${x} ${y + v.ry}`;
  return (
    <g className="pointer-events-none" fill="none" {...style} strokeLinecap="round">
      <path d={horizontal} transform={`rotate(-6 ${x} ${y})`} />
      <path d={vertical} transform={`rotate(-6 ${x} ${y})`} />
    </g>
  );
}

/** Stroked chevron centered on (x, y), pointing toward `angle` degrees (0 = right). */
function Chevron({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <path
      d={`M ${x - 3} ${y - 7} L ${x + 4} ${y} L ${x - 3} ${y + 7}`}
      transform={`rotate(${angle} ${x} ${y})`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Filled triangle centered on (x, y), pointing toward `angle` degrees (0 = right). */
function Triangle({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <path
      d={`M ${x + 5} ${y} L ${x - 3.5} ${y - 5.5} L ${x - 3.5} ${y + 5.5} Z`}
      transform={`rotate(${angle} ${x} ${y})`}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
}

/** Navigation HUD: pan pad, glass orb for orbiting (center resets the view) and zoom rail. */
export default function NavHud({ controls, onReset }: Props) {
  const nav = () => controls.current!;
  const turn = (theta: number, phi: number) => (s: number) => orbit(nav(), theta * ORBIT_SPEED * s, phi * ORBIT_SPEED * s);
  const move = (dx: number, dy: number) => (s: number) => pan(nav(), dx * PAN_SPEED * s, dy * PAN_SPEED * s);
  const scale = (direction: number) => (s: number) => zoom(nav(), ZOOM_IN_RATE ** (direction * s));

  const { x, y } = ORB;
  return (
    <div className="absolute bottom-4 left-1/2 h-[160px] w-[380px] -translate-x-1/2 animate-[fade-in_0.5s_ease-out]">
      <div className="absolute inset-x-0 top-[44px] bottom-0 rounded-[28px] border border-white/8 bg-zinc-900/55 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-md" />
      <svg className="absolute inset-0 overflow-visible" viewBox="0 0 380 160" width={380} height={160}>
        <g aria-label="Pan">
          <circle cx={PAD.x} cy={PAD.y} r={38} fill="#0e0e11" fillOpacity="0.55" stroke="#fff" strokeOpacity="0.09" />
          <circle cx={PAD.x} cy={PAD.y} r={27} fill="none" stroke="#fff" strokeOpacity="0.06" />
          <path
            d={`M ${PAD.x - 10} ${PAD.y} H ${PAD.x + 10} M ${PAD.x} ${PAD.y - 10} V ${PAD.y + 10}`}
            stroke="#fff"
            strokeOpacity="0.18"
          />
          <circle cx={PAD.x} cy={PAD.y} r={2} fill="#d9b8a0" fillOpacity="0.7" />
          <HudButton label="Pan up" step={move(0, 1)}>
            <Hit x={PAD.x} y={PAD.y - 23} r={11} />
            <Triangle x={PAD.x} y={PAD.y - 23} angle={-90} />
          </HudButton>
          <HudButton label="Pan down" step={move(0, -1)}>
            <Hit x={PAD.x} y={PAD.y + 23} r={11} />
            <Triangle x={PAD.x} y={PAD.y + 23} angle={90} />
          </HudButton>
          <HudButton label="Pan left" step={move(-1, 0)}>
            <Hit x={PAD.x - 23} y={PAD.y} r={11} />
            <Triangle x={PAD.x - 23} y={PAD.y} angle={180} />
          </HudButton>
          <HudButton label="Pan right" step={move(1, 0)}>
            <Hit x={PAD.x + 23} y={PAD.y} r={11} />
            <Triangle x={PAD.x + 23} y={PAD.y} angle={0} />
          </HudButton>
        </g>

        <g aria-label="Rotate">
          <Rings front={false} />
          <Orb />
          <Rings front />
          <HudButton label="Rotate left" step={turn(-1, 0)}>
            <Hit x={x - 70} y={y} r={13} />
            <Chevron x={x - 70} y={y} angle={180} />
          </HudButton>
          <HudButton label="Rotate right" step={turn(1, 0)}>
            <Hit x={x + 70} y={y} r={13} />
            <Chevron x={x + 70} y={y} angle={0} />
          </HudButton>
          <HudButton label="Rotate up" step={turn(0, -1)}>
            <Hit x={x} y={y - 64} r={13} />
            <Chevron x={x} y={y - 64} angle={-90} />
          </HudButton>
          <HudButton label="Rotate down" step={turn(0, 1)}>
            <Hit x={x} y={y + 64} r={13} />
            <Chevron x={x} y={y + 64} angle={90} />
          </HudButton>
          <HudButton label="Reset view" step={onReset}>
            <Hit x={x} y={y} r={14} />
            <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx={x} cy={y} r={5} />
              <path d={`M ${x} ${y - 10} V ${y - 7} M ${x} ${y + 7} V ${y + 10} M ${x - 10} ${y} H ${x - 7} M ${x + 7} ${y} H ${x + 10}`} />
            </g>
          </HudButton>
        </g>

        <g aria-label="Zoom">
          <rect x={RAIL.x - 18} y={RAIL.y - 38} width={36} height={76} rx={18} fill="#0e0e11" fillOpacity="0.55" stroke="#fff" strokeOpacity="0.09" />
          <path
            d={`M ${RAIL.x - 5} ${RAIL.y - 6} H ${RAIL.x + 5} M ${RAIL.x - 3} ${RAIL.y} H ${RAIL.x + 3} M ${RAIL.x - 5} ${RAIL.y + 6} H ${RAIL.x + 5}`}
            stroke="#fff"
            strokeOpacity="0.2"
          />
          <HudButton label="Zoom in" step={scale(1)}>
            <Hit x={RAIL.x} y={RAIL.y - 20} r={14} />
            <path
              d={`M ${RAIL.x - 6} ${RAIL.y - 20} H ${RAIL.x + 6} M ${RAIL.x} ${RAIL.y - 26} V ${RAIL.y - 14}`}
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </HudButton>
          <HudButton label="Zoom out" step={scale(-1)}>
            <Hit x={RAIL.x} y={RAIL.y + 20} r={14} />
            <path d={`M ${RAIL.x - 6} ${RAIL.y + 20} H ${RAIL.x + 6}`} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </HudButton>
        </g>
      </svg>
    </div>
  );
}
