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
import colorImagesExtra10 from "@/config/colorImages.extra10.json";
import colorImagesExtra11 from "@/config/colorImages.extra11.json";
import colorImagesExtra12 from "@/config/colorImages.extra12.json";
import colorImagesExtra13 from "@/config/colorImages.extra13.json";
import colorImagesExtra14 from "@/config/colorImages.extra14.json";
import colorImagesExtra15 from "@/config/colorImages.extra15.json";
import colorImagesExtra16 from "@/config/colorImages.extra16.json";
import colorImagesExtra17 from "@/config/colorImages.extra17.json";
import colorImagesExtra18 from "@/config/colorImages.extra18.json";
import colorImagesExtra19 from "@/config/colorImages.extra19.json";
import colorImagesExtra20 from "@/config/colorImages.extra20.json";
import colorImagesExtra21 from "@/config/colorImages.extra21.json";
import colorImagesExtra22 from "@/config/colorImages.extra22.json";
import colorImagesExtra23 from "@/config/colorImages.extra23.json";
import colorImagesExtra24 from "@/config/colorImages.extra24.json";
import colorImagesExtra25 from "@/config/colorImages.extra25.json";
import colorImagesExtra26 from "@/config/colorImages.extra26.json";
import colorImagesExtra27 from "@/config/colorImages.extra27.json";
import colorImagesExtra28 from "@/config/colorImages.extra28.json";
import colorImagesExtra29 from "@/config/colorImages.extra29.json";
import colorImagesExtra30 from "@/config/colorImages.extra30.json";
import colorImagesExtra31 from "@/config/colorImages.extra31.json";
import colorImagesExtra32 from "@/config/colorImages.extra32.json";
import colorImagesExtra33 from "@/config/colorImages.extra33.json";
import colorImagesExtra34 from "@/config/colorImages.extra34.json";
import colorImagesExtra35 from "@/config/colorImages.extra35.json";
import colorImagesExtra36 from "@/config/colorImages.extra36.json";
import colorImagesExtra37 from "@/config/colorImages.extra37.json";
import colorImagesExtra38 from "@/config/colorImages.extra38.json";
import colorImagesExtra39 from "@/config/colorImages.extra39.json";
import colorImagesExtra40 from "@/config/colorImages.extra40.json";
import colorImagesExtra41 from "@/config/colorImages.extra41.json";
import colorImagesExtra42 from "@/config/colorImages.extra42.json";
import colorImagesExtra43 from "@/config/colorImages.extra43.json";
import colorImagesExtra44 from "@/config/colorImages.extra44.json";
import colorImagesExtra45 from "@/config/colorImages.extra45.json";
import colorImagesExtra46 from "@/config/colorImages.extra46.json";
import colorImagesExtra47 from "@/config/colorImages.extra47.json";
import colorImagesExtra48 from "@/config/colorImages.extra48.json";
import colorImagesExtra49 from "@/config/colorImages.extra49.json";
import colorImagesExtra50 from "@/config/colorImages.extra50.json";
import colorImagesExtra51 from "@/config/colorImages.extra51.json";
import { allProducts as products } from "@/config/merchandiseConfig";

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
  colorImagesExtra10,
  colorImagesExtra11,
  colorImagesExtra12,
  colorImagesExtra13,
  colorImagesExtra14,
  colorImagesExtra15,
  colorImagesExtra16,
  colorImagesExtra17,
  colorImagesExtra18,
  colorImagesExtra19,
  colorImagesExtra20,
  colorImagesExtra21,
  colorImagesExtra22,
  colorImagesExtra23,
  colorImagesExtra24,
  colorImagesExtra25,
  colorImagesExtra26,
  colorImagesExtra27,
  colorImagesExtra28,
  colorImagesExtra29,
  colorImagesExtra30,
  colorImagesExtra31,
  colorImagesExtra32,
  colorImagesExtra33,
  colorImagesExtra34,
  colorImagesExtra35,
  colorImagesExtra36,
  colorImagesExtra37,
  colorImagesExtra38,
  colorImagesExtra39,
  colorImagesExtra40,
  colorImagesExtra41,
  colorImagesExtra42,
  colorImagesExtra43,
  colorImagesExtra44,
  colorImagesExtra45,
  colorImagesExtra46,
  colorImagesExtra47,
  colorImagesExtra48,
  colorImagesExtra49,
  colorImagesExtra50,
  colorImagesExtra51,
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
