import { ImageResponse } from "next/og";
import { brand } from "@/config/siteConfig";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        backgroundImage: "radial-gradient(circle at 50% 0%, #181818 0%, #000000 70%)",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#c4a878",
          marginBottom: 24,
        }}
      >
        {brand.name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: 900,
        }}
      >
        {brand.tagline}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 48,
          width: 120,
          height: 4,
          backgroundColor: "#d4bc96",
        }}
      />
    </div>,
    { ...size }
  );
}
