import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';

import { androidHeaderBack, setBackFallback } from '@/components/shared';
import { GATED_ROUTES } from '@/constants/routes';
import { useAccess, useAuthStore, useHasRole } from '@/features/auth';
import { useStackHeaderOptions } from '@/hooks/use_header_options';

// Every route in this group requires a session (guarded in app/_layout.tsx). The role picks the
// app: platform admins get admin/(tabs), everyone else the executive tabs. UX only; the API re-checks.
const PAGE_OPTIONS: Record<string, { animation: 'slide_from_right'; animationDuration: number }> = {
  'broadcasts/new': { animation: 'slide_from_right', animationDuration: 350 },
  'executives/search': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'approvals/search': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'templates/search': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'templates/new': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'templates/[id]/edit': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'reports/search': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'executives/new': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'organisation/unit/new': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
  'organisation/position/new': {
    animation: 'slide_from_right',
    animationDuration: 350,
  },
};
// The tab groups draw their own header (AppTabs), so the stack hides its one there.
const TABS = { headerShown: false };

export default function AppLayout() {
  const access = useAccess();
  const isPlatformAdmin = useHasRole('platform_admin');
  const headerOptions = useStackHeaderOptions();
  const workspaceId = useAuthStore((state) => state.workspace?.organisationId ?? null);
  const exitOrganisation = useAuthStore((state) => state.exitOrganisation);
  const lastWorkspaceId = useRef(workspaceId);
  const isInWorkspace = workspaceId !== null;

  useEffect(() => setBackFallback(isPlatformAdmin ? '/admin' : '/'), [isPlatformAdmin]);

  // Working inside an organisation keeps the admin's screens underneath: entering pushes its Home
  // once those screens exist (one slide); leaving removes them, revealing the page it came from.
  useEffect(() => {
    const previous = lastWorkspaceId.current;
    lastWorkspaceId.current = workspaceId;
    if (!workspaceId || previous === workspaceId) return;
    const frame = requestAnimationFrame(() => router.push('/'));
    return () => cancelAnimationFrame(frame);
  }, [workspaceId]);

  return (
    <Stack
      screenOptions={{
        ...headerOptions,
        headerLeft: androidHeaderBack,
        // iOS keeps its native, finger-following slide; Android gets the same slide instead of its zoom-fade.
        animation: 'slide_from_right',
      }}
    >
      <Stack.Protected guard={!isPlatformAdmin}>
        <Stack.Screen
          name="(tabs)"
          options={TABS}
          // Swipe-back or Android back off the organisation's Home leaves the organisation.
          listeners={{ removed: () => exitOrganisation() }}
        />
        {GATED_ROUTES.map(({ name, access: rule }) => (
          <Stack.Protected key={name} guard={access.check(rule)}>
            <Stack.Screen name={name} options={PAGE_OPTIONS[name]} />
          </Stack.Protected>
        ))}
      </Stack.Protected>
      <Stack.Protected guard={isPlatformAdmin || isInWorkspace}>
        <Stack.Screen name="admin/(tabs)" options={TABS} />
        <Stack.Screen name="admin/organisations/[id]" />
        <Stack.Screen name="admin/organisations/new" />
        <Stack.Screen name="admin/organisations/appoint" />
        <Stack.Screen name="admin/organisations/edit" />
        <Stack.Screen name="admin/organisations/executive" />
        <Stack.Screen name="admin/organisations/members" />
        <Stack.Screen name="admin/organisations/replace-head" />
        <Stack.Screen name="admin/admins/[id]" />
        <Stack.Screen name="admin/admins/new" />
        <Stack.Screen name="admin/payments" />
        <Stack.Screen name="admin/credit-history" />
        <Stack.Screen name="admin/adjust-credits" />
        <Stack.Screen name="admin/broadcasts" />
        <Stack.Screen name="admin/audit" />
        <Stack.Screen name="admin/settings" />
        <Stack.Screen name="admin/notifications" />
      </Stack.Protected>
      <Stack.Screen
        name="profile"
        options={{
          animation: 'slide_from_right',
          animationDuration: 350,
        }}
      />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/support" />
      <Stack.Screen name="settings/appearance" />
      <Stack.Screen name="settings/notifications" />
      <Stack.Screen name="settings/security" />
      <Stack.Screen name="settings/devices" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
