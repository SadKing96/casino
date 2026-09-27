import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { Navbar } from "@/components/Navbar";
import { DealerEasterEgg } from "@/components/DealerEasterEgg";
import { ForcePasswordReset } from "@/components/ForcePasswordReset";
import AnimatedBackground from "@/app/components/AnimatedBackground";
import { getUser } from "@/app/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KingZ Casino",
  description: "Modern Vegas Casino Web App",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AnimatedBackground />
        <UserProvider initialUser={user}>
          <Navbar />
          <ForcePasswordReset />
          <main className="container">
            {children}
          </main>
          <DealerEasterEgg />
        </UserProvider>
      </body>
    </html>
  );
}
