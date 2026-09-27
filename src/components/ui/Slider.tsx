"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

/** Labelled range input showing its current value. */
export default function Slider({ label, value, min, max, step, unit, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between">
        {label}
        <span className="text-zinc-400 tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-sky-500"
      />
    </label>
  );
}
