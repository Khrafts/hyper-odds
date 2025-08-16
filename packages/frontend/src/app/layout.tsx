import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// themeColor should be handled by ThemeProvider instead

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>
            <LayoutContent>{children}</LayoutContent>
            <Toaster />
          </AppProviders>
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
