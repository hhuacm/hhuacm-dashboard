import clsx from "clsx";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import "../index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "HHU ACM Dashboard",
  description: "Dashboard workspace for HHU ACM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="light"
      data-theme="light"
      lang="zh-CN"
      suppressHydrationWarning
    >
      <body
        className={clsx(
          GeistSans.variable,
          GeistMono.variable,
          "bg-background text-foreground antialiased"
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
