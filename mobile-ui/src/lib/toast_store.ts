import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  toast: Toast | null;
}

interface ToastActions {
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const VISIBLE_MS = 3_500;
let nextId = 1;
let timer: ReturnType<typeof setTimeout> | undefined;

// One toast at a time: a new one replaces the last, so quick actions never stack banners.
export const useToastStore = create<ToastState & ToastActions>((set, get) => ({
  toast: null,
  show: (toast) => {
    const id = nextId++;
    clearTimeout(timer);
    set({ toast: { ...toast, id } });
    timer = setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },
  dismiss: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },
}));
