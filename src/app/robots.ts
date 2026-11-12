import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.AUTH_URL || "https://twt.ng";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/tailors", "/fabrics", "/designs"], disallow: ["/api/", "/admin/", "/dashboard/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
