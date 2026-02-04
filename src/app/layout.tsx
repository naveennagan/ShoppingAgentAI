import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import AiChatWidget from "@/components/AiChatWidget";
import Providers from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shop - Future of Commerce",
  description: "Experience shopping with our intelligent agent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <Navbar />
          <div style={{ paddingTop: '1rem', minHeight: 'calc(100vh - 4rem)' }}>
            {children}
          </div>
          <AiChatWidget />
        </Providers>
      </body>
    </html>
  );
}
