import { Tabs } from 'expo-router';
import { Icon } from '../../../components/Icon';
import { useOrgQuery } from '../../../hooks/useOrgQuery';
import { canViewCustomers, canViewDashboard } from '../../../domain/permissions';
import type { AppNotification } from '../../../domain/types';
import { useApp } from '../../../state/useApp';
import { useTheme } from '../../../theme/ThemeProvider';
import { fonts } from '../../../theme/tokens';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { activeMembership, repo, revision } = useApp();
  const role = activeMembership?.role;
  const organizationId = activeMembership?.organizationId ?? '';
  const alerts = useOrgQuery<AppNotification[]>(
    'alerts-badge',
    () => repo.listNotifications(organizationId),
    [organizationId, revision],
  );
  const unread = alerts.data?.filter((item) => !item.readAt).length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: role && canViewDashboard(role) ? undefined : null,
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size }) => <Icon name="home" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarButtonTestID: 'tab-invoices',
          tabBarIcon: ({ color, size }) => <Icon name="invoices" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          href: role && canViewCustomers(role) ? undefined : null,
          tabBarButtonTestID: 'tab-customers',
          tabBarIcon: ({ color, size }) => <Icon name="people" color={String(color)} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarButtonTestID: 'tab-alerts',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => <Icon name="bell" color={String(color)} size={size} />,
        }}
      />
    </Tabs>
  );
}
