import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/components/language-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bàn Bài | Bàn chơi bài trực tuyến",
  description: "Tạo phòng, mời bạn bè và cùng chơi bài trực tuyến.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased"><LanguageProvider>{children}<Toaster position="top-center" /></LanguageProvider></body>
    </html>
  );
}
