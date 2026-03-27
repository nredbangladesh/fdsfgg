import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  userProfile: any | null;
  setUserProfile: (profile: any | null) => void;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  systemState: SystemState | null;
  setSystemState: (state: SystemState | null) => void;
}

export interface SystemState {
  status: 'live' | 'maintenance' | 'paused' | 'sunset' | 'version_blocked';
  scope: string;
  message: {
    title: string;
    body: string;
    eta: number | null;
    contactEmail: string;
    statusPageUrl: string;
  };
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  allowedRoles: string[];
  scheduledAt: number | null;
  scheduledBy: string;
  updatedAt: number;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
  isAuthReady: false,
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  theme: 'chalk',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
    set({ theme });
  },
  systemState: null,
  setSystemState: (state) => set({ systemState: state }),
}));
