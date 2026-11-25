import { useLocalSearchParams } from 'expo-router';
import { PayScreen } from '../../screens/PayScreen';

export default function PayRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <PayScreen token={token ?? ''} />;
}
