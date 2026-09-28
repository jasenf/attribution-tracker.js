import './globals.css';

export const metadata = {
  title: 'Next.js attribution form example',
  description: 'Pass consented first-touch attribution into a Next.js Server Action.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
