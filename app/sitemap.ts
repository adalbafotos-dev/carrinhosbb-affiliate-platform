import type { MetadataRoute } from "next";
import { listAllPostParams, getPublicSilos } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const [silos, posts] = await Promise.all([getPublicSilos(), listAllPostParams()]);

  const now = new Date();

  const base: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/contato`, lastModified: now },
    { url: `${siteUrl}/sobre`, lastModified: now },
    { url: `${siteUrl}/politica-de-afiliados`, lastModified: now },
  ];

  const siloUrls = silos.map((s) => ({
    url: `${siteUrl}/${s.slug}`,
    lastModified: now,
  }));

  const postUrls = posts.map((p) => ({
    url: `${siteUrl}/${p.silo}/${p.slug}`,
    lastModified: now,
  }));

  return [...base, ...siloUrls, ...postUrls];
}
