import type { MetadataRoute } from "next";
import { listAllPostParams, getPublicSilos } from "@/lib/db";
import { resolveSiteUrl } from "@/lib/site/url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = resolveSiteUrl();

  const [silos, posts] = await Promise.all([getPublicSilos(), listAllPostParams()]);

  const now = new Date();

  const base: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now },
    { url: `${siteUrl}/sobre`, lastModified: now },
    { url: `${siteUrl}/colaboradores`, lastModified: now },
    { url: `${siteUrl}/contato`, lastModified: now },
    { url: `${siteUrl}/afiliados`, lastModified: now },
    { url: `${siteUrl}/politica-de-privacidade`, lastModified: now },
    { url: `${siteUrl}/politica-editorial`, lastModified: now },
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

