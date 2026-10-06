import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import colorImageMap from "@/config/colorImages.json";
import colorImagesExtra1 from "@/config/colorImages.extra1.json";
import colorImagesExtra2 from "@/config/colorImages.extra2.json";
import colorImagesExtra3 from "@/config/colorImages.extra3.json";
import colorImagesExtra4 from "@/config/colorImages.extra4.json";
import colorImagesExtra5 from "@/config/colorImages.extra5.json";
import colorImagesExtra6 from "@/config/colorImages.extra6.json";
import colorImagesExtra7 from "@/config/colorImages.extra7.json";
import colorImagesExtra8 from "@/config/colorImages.extra8.json";
import colorImagesExtra9 from "@/config/colorImages.extra9.json";
import { products } from "@/config/merchandiseConfig";

const entries = [
  colorImageMap,
  colorImagesExtra1,
  colorImagesExtra2,
  colorImagesExtra3,
  colorImagesExtra4,
  colorImagesExtra5,
  colorImagesExtra6,
  colorImagesExtra7,
  colorImagesExtra8,
  colorImagesExtra9,
].flatMap((map) => Object.entries(map as Record<string, Record<string, string>>));

describe("per-color photo data", () => {
  it("only references products that exist", () => {
    const ids = new Set(products.map((p) => p.id));
    const unknown = entries.map(([id]) => id).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it("uses exact color names from each product's color list", () => {
    const bad: string[] = [];
    for (const [id, byColor] of entries) {
      const colors = new Set(products.find((p) => p.id === id)?.colors ?? []);
      for (const color of Object.keys(byColor)) {
        if (!colors.has(color)) bad.push(`${id}: "${color}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("points every photo at a file that exists", () => {
    const missing: string[] = [];
    for (const [id, byColor] of entries) {
      for (const [color, src] of Object.entries(byColor)) {
        if (!existsSync(path.join(process.cwd(), "public", src)))
          missing.push(`${id}/${color}: ${src}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
