import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { AuthProvider } from "@/components/layout/auth-provider";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "Megazord - מערכת ניהול אישית",
  description: "Personal management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-800 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
