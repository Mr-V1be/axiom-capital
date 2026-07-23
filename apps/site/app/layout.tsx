import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import "../../web/src/styles/tokens.css";
import "../../web/src/styles/global.css";
import "../../web/src/styles/layout.css";
import "../../web/src/styles/components.css";
import "../../web/src/styles/feedback.css";
import "../../web/src/styles/forms.css";
import "../../web/src/styles/features/dashboard.css";
import "../../web/src/styles/features/accounts.css";
import "../../web/src/styles/features/trading.css";
import "../../web/src/styles/features/trading/order-ticket.css";
import "../../web/src/styles/features/settlements.css";
import "../../web/src/styles/responsive/tablet.css";
import "../../web/src/styles/responsive/mobile.css";

export const metadata: Metadata = {
  title: "Axiom Capital",
  description: "Multi-account crypto trading and profit settlements",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07100e",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
