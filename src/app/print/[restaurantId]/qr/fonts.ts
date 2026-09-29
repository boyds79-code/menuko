import { Anton, Bebas_Neue, Fraunces, Montserrat, Shrikhand } from "next/font/google";

// Display faces for the printable QR card designs (qr-designs.tsx) — only
// loaded on the print page, never on the customer menu.
export const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-qr-bebas" });
export const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-qr-anton" });
export const montserrat = Montserrat({ weight: ["500", "600", "800"], subsets: ["latin"], variable: "--font-qr-montserrat" });
export const shrikhand = Shrikhand({ weight: "400", subsets: ["latin"], variable: "--font-qr-shrikhand" });
export const fraunces = Fraunces({ weight: ["700", "900"], subsets: ["latin"], variable: "--font-qr-fraunces" });

export const qrFontVariables = [bebas, anton, montserrat, shrikhand, fraunces].map((f) => f.variable).join(" ");
