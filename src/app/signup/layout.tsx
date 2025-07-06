import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import '@mantine/core/styles.css';
import {
  ColorSchemeScript,
  MantineProvider,
} from '@mantine/core';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign In | My-SRE",
  description: "Sign In Page",
};

export default function SignPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MantineProvider
          defaultColorScheme="light"
          forceColorScheme="light"
          theme={{
            fontFamily: `${geistSans.style.fontFamily}, sans-serif`,
            headings: { fontFamily: `${geistSans.style.fontFamily}, sans-serif` },
          }}
        >
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}