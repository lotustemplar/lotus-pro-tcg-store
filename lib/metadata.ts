import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://lotusprotcg.com";
const DEFAULT_SOCIAL_IMAGE = "/social-preview.png";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
}

export function toAbsoluteUrl(path: string | null | undefined) {
  if (!path) return `${getSiteUrl()}${DEFAULT_SOCIAL_IMAGE}`;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, getSiteUrl()).toString();
}

export function buildSocialMetadata({
  title,
  description,
  path = "/",
  image,
  siteName,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  siteName: string;
}): Pick<Metadata, "alternates" | "metadataBase" | "openGraph" | "twitter"> {
  const siteUrl = getSiteUrl();
  const imageUrl = toAbsoluteUrl(image || DEFAULT_SOCIAL_IMAGE);
  const canonicalUrl = new URL(path, siteUrl).toString();

  return {
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
