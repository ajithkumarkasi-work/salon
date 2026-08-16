import { create } from 'zustand';

type SalonState = {
  activeSalonId: string | null;
  setActiveSalonId: (salonId: string | null) => void;
};

export const useSalonStore = create<SalonState>((set) => ({
  activeSalonId: null,
  setActiveSalonId: (activeSalonId) => set({ activeSalonId }),
}));