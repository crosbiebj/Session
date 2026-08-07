import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_RECENTS = 10;

type RecentsState = {
  recentSpotIds: string[];
  touchSpot: (id: string) => void;
};

// "If I am fishing swim 7 on Willow and I need to check my spot info, I'd
// like it to be closer to hand" — a client-side most-recently-viewed
// list, not a DB column, since this is purely about what this one device
// looked at most recently, not something that needs to sync or be
// queried server-side.
export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      recentSpotIds: [],
      touchSpot: (id) =>
        set((state) => ({
          recentSpotIds: [id, ...state.recentSpotIds.filter((existing) => existing !== id)].slice(
            0,
            MAX_RECENTS,
          ),
        })),
    }),
    {
      name: 'session-recents',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
