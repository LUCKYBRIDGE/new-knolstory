import type { Metadata } from 'next';
import { INSTALL_CAPTURE_SCRIPT } from '../lib/app-install-capture';
import './globals.css';
import tokens from '../../../packages/design-tokens/tokens.json';
export const metadata: Metadata = { title: '놀스토리', description: '이야기를 읽고 직접 만드는 놀스토리', applicationName: '놀스토리',
  icons: { icon: [{ url: '/app-icons/favicon-48.png', sizes: '48x48', type: 'image/png' }, { url: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: [{ url: '/app-icons/apple-touch-icon.png', sizes: '180x180' }] },
  appleWebApp: { capable: true, title: '놀스토리', statusBarStyle: 'default' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ko"><head><script dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE_SCRIPT }} /></head><body style={{
  "--paper": tokens.paper, "--ink": tokens.ink, "--mint": tokens.mint, "--mint-strong": tokens.mintStrong, "--gold": tokens.gold, "--coral": tokens.coral, "--navy": tokens.navy
} as React.CSSProperties}>{children}</body></html>; }
