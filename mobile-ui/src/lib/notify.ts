import { ApiError } from '@/lib/api';
import { useToastStore, type ToastKind } from '@/lib/toast_store';
import { haptics } from '@/utils/haptics';

const show = (kind: ToastKind, title: string, description?: string) =>
  useToastStore.getState().show({ kind, title, description });

// The one way to show a toast: each kind comes with its matching haptic, and messages stay short.
// Rendered by <AppToaster /> in the root layout.
export const notify = {
  success: (title: string, description?: string) => {
    haptics.success();
    show('success', title, description);
  },
  error: (title: string, description?: string) => {
    haptics.error();
    show('error', title, description);
  },
  warning: (title: string, description?: string) => {
    haptics.error();
    show('warning', title, description);
  },
  info: (title: string, description?: string) => show('info', title, description),

  // Rate limits and lockouts are a "wait", not a failure, so they show as warnings.
  apiError: (error: unknown) => {
    const apiError = ApiError.from(error);
    return apiError.kind === 'rate_limited'
      ? notify.warning(apiError.message)
      : notify.error(apiError.message);
  },
};
