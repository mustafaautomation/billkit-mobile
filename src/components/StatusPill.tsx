import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STATUS_LABEL } from '../domain/status';
import type { DisplayStatus } from '../domain/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type Palette } from '../theme/tokens';

function colorsFor(status: DisplayStatus, colors: Palette): { bg: string; fg: string } {
  if (status === 'paid') return { bg: colors.successSoft, fg: colors.success };
  if (status === 'overdue') return { bg: colors.dangerSoft, fg: colors.danger };
  if (status === 'partial') return { bg: colors.warningSoft, fg: colors.warning };
  if (status === 'draft') return { bg: colors.surfaceMuted, fg: colors.muted };
  return { bg: colors.infoSoft, fg: colors.primary };
}

export function StatusPill({ status }: { status: DisplayStatus }) {
  const { colors } = useTheme();
  const tone = colorsFor(status, colors);
  return (
    <View
      accessibilityLabel={`Status ${STATUS_LABEL[status]}`}
      style={[styles.pill, { backgroundColor: tone.bg }]}
    >
      <Text style={[styles.text, { color: tone.fg, fontFamily: fonts.semibold }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function FilterChips({
  value,
  onChange,
}: {
  value: 'all' | 'unpaid' | 'overdue' | 'paid' | 'draft';
  onChange: (value: 'all' | 'unpaid' | 'overdue' | 'paid' | 'draft') => void;
}) {
  const { colors } = useTheme();
  const options = [
    ['all', 'All'],
    ['unpaid', 'Unpaid'],
    ['overdue', 'Overdue'],
    ['paid', 'Paid'],
    ['draft', 'Drafts'],
  ] as const;
  return (
    <View style={styles.filters}>
      {options.map(([id, label]) => {
        const selected = value === id;
        return (
          <Pressable
            key={id}
            testID={`filter-${id}`}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${label}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(id)}
            style={[
              styles.chip,
              { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line },
            ]}
          >
            <Text style={{ color: selected ? colors.onPrimary : colors.ink, fontFamily: fonts.medium, fontSize: 13 }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
});
