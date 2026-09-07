import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpeedyMeals',
  description: 'Order fast. Track live. Pay easy.',
  icons: {
    icon: '/favicon.jpeg',
    shortcut: '/favicon.jpeg',
    apple: '/favicon.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.jpeg" type="image/jpeg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
