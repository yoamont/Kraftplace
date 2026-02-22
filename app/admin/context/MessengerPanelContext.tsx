'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type MessengerPanelParams = {
  brandId: number;
  showroomId: number;
  placementId?: string;
  title: string;
  /** Logo de la marque ou de la boutique pour le bouton flottant */
  avatarUrl?: string | null;
};

type MessengerPanelContextValue = {
  isOpen: boolean;
  isMinimized: boolean;
  params: MessengerPanelParams | null;
  openMessenger: (p: MessengerPanelParams) => void;
  closeMessenger: () => void;
  toggleMinimized: () => void;
};

const MessengerPanelContext = createContext<MessengerPanelContextValue | null>(null);

export function MessengerPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [isMinimized, setMinimized] = useState(false);
  const [params, setParams] = useState<MessengerPanelParams | null>(null);

  const openMessenger = useCallback((p: MessengerPanelParams) => {
    setParams(p);
    setOpen(true);
    setMinimized(false);
  }, []);

  const closeMessenger = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    setParams(null);
  }, []);

  const toggleMinimized = useCallback(() => {
    setMinimized((prev) => !prev);
  }, []);

  return (
    <MessengerPanelContext.Provider
      value={{
        isOpen,
        isMinimized,
        params,
        openMessenger,
        closeMessenger,
        toggleMinimized,
      }}
    >
      {children}
    </MessengerPanelContext.Provider>
  );
}

export function useMessengerPanel() {
  const ctx = useContext(MessengerPanelContext);
  if (!ctx) throw new Error('useMessengerPanel must be used within MessengerPanelProvider');
  return ctx;
}
