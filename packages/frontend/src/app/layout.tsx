import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "HyperOdds - Prediction Markets",
  description: "Decentralized prediction markets on Hyperliquid",
  keywords: ["prediction markets", "betting", "DeFi", "Hyperliquid", "Arbitrum"],
  authors: [{ name: "HyperOdds Team" }],
  openGraph: {
    title: "HyperOdds - Prediction Markets",
    description: "Trade on the future with decentralized prediction markets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HyperOdds - Prediction Markets",
    description: "Trade on the future with decentralized prediction markets",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
