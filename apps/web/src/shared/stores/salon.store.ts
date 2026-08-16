import { create } from 'zustand';

interface SalonState {
  activeSalonId: string | null;
  setActiveSalon: (id: string) => void;
}

export const useSalonStore = create<SalonState>((set) => ({
  activeSalonId: null,
  setActiveSalon: (id) => set({ activeSalonId: id }),
}));
