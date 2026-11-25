import Svg, { Path } from 'react-native-svg';

export type IconName = 'home' | 'invoices' | 'people' | 'bell' | 'settings' | 'plus' | 'search' | 'check';

const PATHS: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
  invoices: 'M7 3.5h6.5L18 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Zm6.2 1.2V8.2H18M8.5 12.5h7M8.5 16h5',
  people: 'M9 11.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2ZM15.6 11a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM3.8 19.2c.4-2.7 2.4-4.3 5.2-4.3s4.8 1.6 5.2 4.3M14.2 14.9c1.8.2 3.3 1.2 3.8 4.3',
  bell: 'M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.3 5.2 1.7 5.6H4.5c.4-.4 1.7-1.4 1.7-5.6ZM10 18.6a2 2 0 0 0 4 0',
  settings: 'M4 8h10M18 8h2M4 16h2M10 16h10M14 8a2.2 2.2 0 1 0 0.01 0M8 16a2.2 2.2 0 1 0 0.01 0',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.5 16.5 20 20',
  check: 'M5 12.5 9.2 17 19 7',
};

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path d={PATHS[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
