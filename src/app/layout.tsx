import "./globals.css";
import type { Metadata } from "next";
import { COPY } from "@/data/copy";

export const metadata: Metadata = {
  title: COPY.app.title,
  description: COPY.app.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
