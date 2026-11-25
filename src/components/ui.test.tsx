import type { ReactElement } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusPill } from './StatusPill';
import { EmptyState, ErrorState } from './States';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AppProvider } from '../state/AppProvider';
import { SignInScreen } from '../screens/SignInScreen';
import { createMockRepository } from '../data/mockRepository';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('status and empty states', () => {
  it('labels an overdue invoice', async () => {
    const view = await renderWithTheme(<StatusPill status="overdue" />);
    expect(view.getByLabelText('Status Overdue')).toBeTruthy();
    expect(view.getByText('Overdue')).toBeTruthy();
  });

  it('shows an empty explanation and a retry action', async () => {
    const onRetry = jest.fn();
    const view = await renderWithTheme(
      <>
        <EmptyState title="No invoices here" body="Try another filter." />
        <ErrorState message="The ledger did not load." onRetry={onRetry} />
      </>,
    );
    expect(view.getByText('No invoices here')).toBeTruthy();
    fireEvent.press(view.getByTestId('retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('sign in screen', () => {
  it('rejects a wrong password and enters the demo workspace', async () => {
    const onSignedIn = jest.fn();
    const repo = createMockRepository();
    const view = await render(
      <SafeAreaProvider initialMetrics={{ insets: { top: 0, bottom: 0, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } }}>
        <ThemeProvider>
          <AppProvider repository={repo}>
            <SignInScreen onSignedIn={onSignedIn} />
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    await fireEvent.changeText(view.getByTestId('password-input'), 'nope');
    await fireEvent.press(view.getByTestId('sign-in'));
    expect(await view.findByTestId('auth-error')).toHaveTextContent(/do not match/);
    await fireEvent.changeText(view.getByTestId('password-input'), '');
    await fireEvent.press(view.getByTestId('sign-in'));
    expect(await view.findByTestId('auth-error')).toHaveTextContent('Enter your password.');
    await fireEvent.press(view.getByTestId('try-demo'));
    await view.findByTestId('try-demo');
    expect(onSignedIn).toHaveBeenCalled();
    expect((await repo.getSession())?.email).toBe('maya@northwind.studio');
  });
});
