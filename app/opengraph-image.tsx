import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vendi — Tu tienda online, lista en minutos";

// OG image de marca: noche cálida, wordmark con el punto vendi y tagline.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(80% 80% at 50% 0%, #3a2420 0%, #211d1a 60%)",
          color: "#faf7f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: 160, fontWeight: 800, letterSpacing: -8 }}>
            vendi
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#e0563f",
              marginLeft: 10,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 38,
            fontWeight: 300,
            color: "#d6cec6",
            marginTop: 8,
          }}
        >
          Tu tienda online, lista en minutos.
        </span>
        <span
          style={{
            fontSize: 22,
            color: "#8a817a",
            marginTop: 28,
            textTransform: "uppercase",
            letterSpacing: 6,
          }}
        >
          by Olcas Apps
        </span>
      </div>
    ),
    size
  );
}
