import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "منصة الفيزياء | أ. محمود الشحات",
  description: "المنصة التعليمية الأولى للفيزياء - الأستاذ محمود الشحات",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/Images/final_logo_48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/Images/final_logo_square_512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} scroll-smooth snap-y snap-mandatory`}>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-cairo">
        {children}
      </body>
    </html>
  );
}
