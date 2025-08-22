import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url

  // Static pages
  const staticPages = [
    '',
    '/markets',
    '/portfolio',
    '/create',
    '/leaderboard',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // TODO: Add dynamic market pages from GraphQL
  // const markets = await fetchMarkets()
  // const marketPages = markets.map((market) => ({
  //   url: `${baseUrl}/markets/${market.id}`,
  //   lastModified: new Date(market.updatedAt),
  //   changeFrequency: 'hourly' as const,
  //   priority: 0.6,
  // }))

  return [...staticPages]
}