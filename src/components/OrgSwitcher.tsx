import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { roleLabel } from '../domain/permissions';
import type { Membership } from '../domain/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function OrgSwitcher({
  visible,
  memberships,
  activeId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  memberships: Membership[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (organizationId: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close workspace switcher">
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink, fontFamily: fonts.display }]}>
            Workspaces
          </Text>
          {memberships.map((membership) => {
            const selected = membership.organizationId === activeId;
            return (
              <Pressable
                key={membership.organizationId}
                testID={`org-option-${membership.organizationId}`}
                accessibilityRole="button"
                accessibilityLabel={`${membership.organizationName}, ${roleLabel(membership.role)}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(membership.organizationId);
                  onClose();
                }}
                style={[styles.row, { borderColor: colors.line, backgroundColor: selected ? colors.infoSoft : colors.bg }]}
              >
                <View>
                  <Text style={{ color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }}>{membership.organizationName}</Text>
                  <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>{roleLabel(membership.role)}</Text>
                </View>
                <Text style={{ color: colors.primary, fontFamily: fonts.semibold }}>{selected ? 'Current' : 'Switch'}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <Text style={{ color: colors.muted, fontFamily: fonts.medium }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 27, 0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  title: { fontSize: 28 },
  row: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
