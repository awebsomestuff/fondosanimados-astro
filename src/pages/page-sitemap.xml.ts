import type { APIRoute } from 'astro';
import sitemapData from '../data/sitemap.json';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  images: string[];
}

export const GET: APIRoute = async () => {
  const entries = sitemapData.urls as SitemapEntry[];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/main-sitemap.xsl"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const entry of entries) {
    xml += `\t<url>
\t\t<loc>${escapeXml(entry.loc)}</loc>
\t\t<lastmod>${entry.lastmod}</lastmod>
`;

    // Add images
    for (const imageUrl of entry.images) {
      xml += `\t\t<image:image>
\t\t\t<image:loc>${escapeXml(imageUrl)}</image:loc>
\t\t</image:image>
`;
    }

    xml += `\t</url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
