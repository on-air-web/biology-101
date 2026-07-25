import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

/**
 * Archivo is loaded with its width axis so headings can be set expanded from a
 * single variable file — no second family, no extra request.
 */
export const display = Archivo({
  subsets: ['latin'],
  // A variable axis and a fixed weight list are mutually exclusive in
  // next/font. Requesting the width axis means taking the full variable
  // range, which is what we want anyway: headings are set at wdth 112.
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

export const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const fontClassNames = [display.variable, sans.variable, mono.variable].join(' ');
