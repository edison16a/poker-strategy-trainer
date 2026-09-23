import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { COPY } from "@/data/copy";

export const metadata: Metadata = {
  title: COPY.app.title,
  description: COPY.app.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
