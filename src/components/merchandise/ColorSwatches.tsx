import { swatchColor } from "@/lib/colorSwatches";

interface ColorSwatchesProps {
  colors: string[];
  /** Max swatches to render before collapsing the rest into a "+N" pill. */
  max?: number;
  size?: "sm" | "md";
  /** When set, swatches become clickable and the matching color is ringed. */
  selected?: string;
  onSelect?: (color: string) => void;
}

export default function ColorSwatches({ colors, max = 12, size = "sm", selected, onSelect }: ColorSwatchesProps) {
  if (colors.length === 0) return null;

  const dimension = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const visible = colors.slice(0, max);
  const remaining = colors.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((color) => {
        const isSelected = selected === color;
        const swatch = (
          <span
            className={`${dimension} block shrink-0 rounded-full border ${
              isSelected ? "border-onyx" : "border-onyx/15"
            }`}
            style={{ backgroundColor: swatchColor(color) }}
          />
        );

        if (!onSelect) {
          return (
            <span key={color} title={color}>
              {swatch}
            </span>
          );
        }

        return (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            aria-pressed={isSelected}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelect(color);
            }}
            className={`rounded-full p-0.5 transition-shadow ${
              isSelected ? "ring-2 ring-offset-1 ring-onyx" : "hover:ring-1 hover:ring-onyx/40"
            }`}
          >
            {swatch}
          </button>
        );
      })}
      {remaining > 0 && (
        <span className="text-xs font-medium text-onyx/50">+{remaining} more</span>
      )}
    </div>
  );
}
