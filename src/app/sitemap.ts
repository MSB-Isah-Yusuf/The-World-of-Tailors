import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.AUTH_URL || "https://twt.ng";
  const routes = ["", "/tailors", "/fabrics", "/designs", "/sellers", "/checkout", "/login", "/register", "/register/tailor", "/register/seller", "/register/customer"];
  return routes.map((r) => ({ url: `${base}${r || "/"}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: r === "" ? 1 : 0.7 }));
}
