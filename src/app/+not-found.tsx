import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export default function NotFound() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 32 }}>
        That page is not in Billkit
      </Text>
      <Button label="Go to Billkit" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
});
