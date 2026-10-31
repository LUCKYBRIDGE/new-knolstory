import type { Metadata } from 'next';
import './globals.css';
import tokens from '../../../packages/design-tokens/tokens.json';
export const metadata: Metadata = { title: '놀스토리', description: '이야기를 읽고 직접 만드는 놀스토리' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body style={{
  "--paper": tokens.paper, "--ink": tokens.ink, "--mint": tokens.mint, "--mint-strong": tokens.mintStrong, "--gold": tokens.gold, "--coral": tokens.coral, "--navy": tokens.navy
} as React.CSSProperties}>{children}</body></html>; }
