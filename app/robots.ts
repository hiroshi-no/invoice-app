import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/documents/',
          '/login',
          '/forgot-password',
          '/update-password',
        ],
      },
    ],
    sitemap: 'https://seikyunote.com/sitemap.xml',
  }
}