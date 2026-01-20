import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poker Strategy Trainer",
  description: "Poker strategy puzzles, AI coaching, and outs training.",
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
