import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../domain/money';
import { TEST_CARD } from '../domain/types';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Button } from './Button';
import { TextField } from './TextField';

export function PaymentSheet({
  visible,
  amountCents,
  currency,
  invoiceNumber,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  amountCents: number;
  currency: string;
  invoiceNumber: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (cardNumber: string) => void;
}) {
  const { colors } = useTheme();
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 28');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    if (card.replace(/\s/g, '').length < 16) {
      setLocalError('Enter the 16-digit test card.');
      return;
    }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
      setLocalError('Enter an expiry like 12 / 28.');
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setLocalError('Enter the CVC.');
      return;
    }
    if (!name.trim()) {
      setLocalError('Enter the name on the card.');
      return;
    }
    setLocalError(null);
    onConfirm(card);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close payment">
        <Pressable testID="payment-sheet" style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => undefined}>
          <Text style={[styles.kicker, { color: colors.muted, fontFamily: fonts.medium }]}>Pay {invoiceNumber}</Text>
          <Text style={[styles.amount, { color: colors.ink, fontFamily: fonts.display }]}>{formatMoney(amountCents, currency)}</Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
            Test mode. Use card {TEST_CARD.replace(/(.{4})/g, '$1 ').trim()}.
          </Text>
          <TextField label="Card number" value={card} onChangeText={setCard} testID="card-number" keyboardType="number-pad" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Expiry" value={expiry} onChangeText={setExpiry} testID="card-expiry" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="CVC" value={cvc} onChangeText={setCvc} testID="card-cvc" keyboardType="number-pad" secureTextEntry />
            </View>
          </View>
          <TextField label="Name on card" value={name} onChangeText={setName} testID="card-name" autoCapitalize="words" />
          {localError || error ? (
            <Text testID="payment-error" style={{ color: colors.danger, fontFamily: fonts.medium }}>
              {localError || error}
            </Text>
          ) : null}
          <Button testID="mock-pay-confirm" label={busy ? 'Paying' : `Pay ${formatMoney(amountCents, currency)}`} loading={busy} onPress={submit} />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 27, 0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  kicker: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  amount: { fontSize: 40 },
  row: { flexDirection: 'row', gap: 12 },
});
