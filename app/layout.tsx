import type { Metadata, Viewport } from "next";
import { WeatherProvider } from "@/components/weather-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import { PixelIntro } from "@/components/pixel-intro";
import "./globals.css";

export const metadata: Metadata = {
  title: "ME",
  description: "Systems-focused engineer building precise software and playful worlds.",
};

export const viewport: Viewport = {
  themeColor: "#090c10",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WeatherProvider>
          <PixelIntro />
          <SmoothScroll>{children}</SmoothScroll>
        </WeatherProvider>
      </body>
    </html>
  );
}
