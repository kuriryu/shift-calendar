"use client";

import { create } from "zustand";

type Toast = { id: string; message: string };

type ToastState = {
  toasts: Toast[];
  push: (message: string) => void;
  dismiss: (id: string) => void;
};

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message) => {
    const id = String(++toastCounter);
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    window.setTimeout(() => {
      get().dismiss(id);
    }, 3000);
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
  },
}));

export function toast(message: string) {
  useToastStore.getState().push(message);
}
