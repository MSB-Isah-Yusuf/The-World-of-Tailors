import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The World of Tailors",
    short_name: "TWT",
    description: "Lagos-first tailoring, fashion design & fabric marketplace — verified tailors, Paystack secure",
    start_url: "/",
    display: "standalone",
    background_color: "#10182B",
    theme_color: "#10182B",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
