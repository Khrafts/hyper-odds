import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { PerformanceMonitor, BundleSizeReporter } from "@/components/common/performance-monitor";

// Optimize font loading with preload and fallback
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // Improve font loading performance
  preload: true,
  fallback: ["system-ui", "arial"],
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
  // Performance optimizations
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

// themeColor should be handled by ThemeProvider instead

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        
        {/* Performance hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Preload important scripts */}
        <link rel="modulepreload" href="/_next/static/chunks/webpack.js" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PerformanceMonitor>
            <AppProviders>
              <LayoutContent>{children}</LayoutContent>
              <Toaster 
                position="top-right"
                richColors
                expand={true}
                closeButton
                theme="system"
              />
              <BundleSizeReporter />
            </AppProviders>
          </PerformanceMonitor>
        </ThemeProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
