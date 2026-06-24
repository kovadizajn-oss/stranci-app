import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kvantus App",
  description: "Upravljanje stranim radnicima",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
