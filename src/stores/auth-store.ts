import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  // Set optimistically the moment a sign-up attempt starts (before the
  // request even resolves) so there's no race against the auth listener
  // picking up the new session — (auth)/_layout.tsx reads this to send a
  // brand new account through /welcome instead of straight to /(app). A
  // plain sign-in never touches this, so returning anglers never see it.
  justSignedUp: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setJustSignedUp: (justSignedUp: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  justSignedUp: false,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setJustSignedUp: (justSignedUp) => set({ justSignedUp }),
}));
