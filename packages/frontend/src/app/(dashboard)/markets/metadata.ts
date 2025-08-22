import { Metadata } from 'next'
import { constructMetadata } from '@/lib/seo'

export const metadata: Metadata = constructMetadata({
  title: 'Prediction Markets | HyperOdds',
  description: 'Browse and trade on hundreds of prediction markets. Bet on sports, politics, crypto prices, and more with transparent, decentralized betting on HyperOdds.',
})