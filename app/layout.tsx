import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 或你原本的字體 import
import "./globals.css";
import { Toaster } from "@/components/ui/sonner" // 新增這行

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Course Swap Platform",
  description: "Swap your course sections easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster /> {/* 新增這行：放在這裡確保全域可用 */}
      </body>
    </html>
  );
}