import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Button } from './Button';

export function LoadingState({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.text, { color: colors.muted, fontFamily: fonts.medium }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: colors.muted, fontFamily: fonts.body }]}>{body}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.dangerSoft, borderColor: colors.line }]} testID="error-state">
      <Text accessibilityRole="header" style={[styles.title, { color: colors.danger, fontFamily: fonts.display }]}>
        Something needs attention
      </Text>
      <Text style={[styles.body, { color: colors.ink, fontFamily: fonts.body }]}>{message}</Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} testID="retry" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  text: { fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 10 },
  title: { fontSize: 24 },
  body: { fontSize: 15, lineHeight: 22 },
});
