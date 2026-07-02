import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Costimator - DPWH Cost Estimation System",
  description: "Integrated cost estimation, DUPA, and BOQ management for DPWH projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var d=document;var r=function(){var a=d.querySelectorAll('[fdprocessedid]');for(var i=0;i<a.length;i++){a[i].removeAttribute('fdprocessedid')}};r();new MutationObserver(r).observe(d.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:['fdprocessedid']})})()`
        }} />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
