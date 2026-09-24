import { swatchColor } from "@/lib/colorSwatches";

interface ColorSwatchesProps {
  colors: string[];
  /** Max swatches to render before collapsing the rest into a "+N" pill. */
  max?: number;
  size?: "sm" | "md";
}

export default function ColorSwatches({ colors, max = 8, size = "sm" }: ColorSwatchesProps) {
  if (colors.length === 0) return null;

  const dimension = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const visible = colors.slice(0, max);
  const remaining = colors.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((color) => (
        <span
          key={color}
          title={color}
          className={`${dimension} shrink-0 rounded-full border border-onyx/15`}
          style={{ backgroundColor: swatchColor(color) }}
        />
      ))}
      {remaining > 0 && (
        <span className="text-xs font-medium text-onyx/50">+{remaining} more</span>
      )}
    </div>
  );
}
