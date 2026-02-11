'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import AiChatPanel from "@/components/AiChatPanel";
import AiSuggestionToast from "@/components/AiSuggestionToast";
import Providers from "@/components/Providers";
import "./globals.css";
import "@/styles/main.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(400);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const handleCartUpdate = (e: CustomEvent) => {
      if (!isChatOpen && e.detail?.suggestion) {
        setSuggestion(e.detail.suggestion);
      }
    };

    window.addEventListener('ai-suggestion' as any, handleCartUpdate);
    return () => window.removeEventListener('ai-suggestion' as any, handleCartUpdate);
  }, [isChatOpen]);

  return (
    <>
      <Navbar 
        onToggleChat={() => setIsChatOpen(!isChatOpen)} 
        isChatOpen={isChatOpen}
        chatWidth={chatWidth}
      />
      <div style={{ 
        paddingTop: '1rem', 
        minHeight: 'calc(100vh - 4rem)',
        marginRight: isChatOpen ? `${chatWidth}px` : '0',
        transition: 'margin-right 0.3s ease',
        paddingLeft: '2rem',
        paddingRight: '2rem'
      }}>
        {children}
      </div>
      <AiChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        onWidthChange={setChatWidth}
      />
      {suggestion && (
        <AiSuggestionToast
          message={suggestion}
          onClose={() => setSuggestion(null)}
          onOpenChat={() => {
            setSuggestion(null);
            setIsChatOpen(true);
          }}
        />
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <RootLayoutClient>{children}</RootLayoutClient>
        </Providers>
      </body>
    </html>
  );
}
