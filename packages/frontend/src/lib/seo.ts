import { Metadata } from 'next'

export const siteConfig = {
  name: 'HyperOdds',
  title: 'HyperOdds - Decentralized Prediction Markets',
  description: 'Trade on the future with transparent, decentralized prediction markets on Hyperliquid. Bet on real-world events and earn from your insights.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://hyperodds.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://twitter.com/hyperodds',
    github: 'https://github.com/hyperodds',
    docs: 'https://docs.hyperodds.com',
  },
  keywords: [
    'prediction markets',
    'decentralized betting',
    'DeFi',
    'Hyperliquid',
    'Arbitrum',
    'crypto betting',
    'event trading',
    'sports betting',
    'political betting',
    'market predictions',
    'web3 gambling',
    'blockchain betting'
  ]
}

export function constructMetadata({
  title = siteConfig.title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  icons = '/favicon.ico',
  noIndex = false,
}: {
  title?: string
  description?: string
  image?: string
  icons?: string
  noIndex?: boolean
} = {}): Metadata {
  return {
    title,
    description,
    keywords: siteConfig.keywords,
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
      creator: '@hyperodds',
    },
    icons,
    metadataBase: new URL(siteConfig.url),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  }
}

// Generate dynamic metadata for market pages
export function generateMarketMetadata({
  title,
  description,
  marketId,
}: {
  title: string
  description: string
  marketId: string
}): Metadata {
  return constructMetadata({
    title: `${title} | HyperOdds`,
    description: description || `Trade on "${title}" - Make predictions and earn rewards on HyperOdds prediction markets.`,
    image: `/api/og/market/${marketId}`,
  })
}

// Structured data for SEO
export function generateStructuredData(type: 'website' | 'market', data?: any) {
  if (type === 'website') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.name,
      description: siteConfig.description,
      url: siteConfig.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteConfig.url}/markets?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  }

  if (type === 'market' && data) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: data.title,
      description: data.description,
      startDate: new Date(parseInt(data.createdAt) * 1000).toISOString(),
      endDate: data.cutoffTime ? new Date(parseInt(data.cutoffTime) * 1000).toISOString() : undefined,
      eventStatus: data.resolved ? 'EventCompleted' : 'EventScheduled',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: data.resolved ? 'SoldOut' : 'InStock'
      }
    }
  }

  return null
}