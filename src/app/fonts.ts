import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

/**
 * Two faces only. The expanded display type that used to sit here read as
 * editorial rather than instrumental, which is not what this audience trusts.
 */
export const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontClassNames = [sans.variable, mono.variable].join(' ');
