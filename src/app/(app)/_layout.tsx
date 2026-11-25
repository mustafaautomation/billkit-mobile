import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { OfflineBanner, ToastBanner } from '../../components/AppHeader';
import { LoadingState } from '../../components/States';
import { useApp } from '../../state/useApp';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';

export default function AppLayout() {
  const { ready, session } = useApp();
  const { colors } = useTheme();
  if (!ready) return <LoadingState label="Opening your workspace" />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <OfflineBanner />
      <ToastBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="invoice/new" options={{ title: 'New invoice' }} />
        <Stack.Screen name="invoice/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="invoice/pdf/[id]" options={{ title: 'Invoice PDF' }} />
        <Stack.Screen name="customer/new" options={{ title: 'New customer' }} />
      </Stack>
    </View>
  );
}
