export type Palette = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  infoSoft: string;
  shadow: string;
};

export const lightPalette: Palette = {
  bg: '#F3EEE4',
  surface: '#FFFCF7',
  surfaceMuted: '#EAE3D4',
  ink: '#1C1915',
  muted: '#3E4C4A',
  line: '#E4D9C6',
  primary: '#0E6B66',
  primaryPressed: '#0A524E',
  onPrimary: '#F7FFFD',
  accent: '#A86B12',
  danger: '#9C2F2F',
  dangerSoft: '#F8E4E1',
  success: '#1B6B45',
  successSoft: '#E3F3EA',
  warning: '#8A4B12',
  warningSoft: '#F8E7D2',
  infoSoft: '#E4F2F1',
  shadow: 'rgba(28, 25, 21, 0.08)',
};

export const darkPalette: Palette = {
  bg: '#10161B',
  surface: '#1A232B',
  surfaceMuted: '#24313B',
  ink: '#F4EFE6',
  muted: '#C9D4CF',
  line: '#31414C',
  primary: '#7ED0C8',
  primaryPressed: '#A6E2DC',
  onPrimary: '#08211F',
  accent: '#E2B15A',
  danger: '#F0A8A2',
  dangerSoft: '#3A2424',
  success: '#8ED4AE',
  successSoft: '#1A3328',
  warning: '#E2B15A',
  warningSoft: '#3A2E1C',
  infoSoft: '#1A3332',
  shadow: 'rgba(0, 0, 0, 0.35)',
};

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  body: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
};
