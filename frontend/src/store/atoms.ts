import { User, Video, adminVideoTypes } from '@/types/common';
import { atom } from 'recoil';


export interface HomePageVideosList {
  id: number;
  title: string;
  description: string;
  thumbnail?: string;
  views: number;
  manifestUrl?: string;
}

// UI State
export const sidebarToggleAtom = atom({
  key: 'sidebarToggleAtom',
  default: false,
});

// Video States
export const homeContentAtom = atom<HomePageVideosList[]>({
  key: 'homeContentAtom',
  default: [],
});

export const currentWatchingVideoAtom = atom<HomePageVideosList | null>({
  key: 'currentWatchingVideoAtom',
  default: null,
});

// User States
export const userAtom = atom<User | null>({
  key: 'userAtom',
  default: null,
});

export const isLoggedInAtom = atom({
  key: 'isLoggedInAtom',
  default: !!window.localStorage.getItem("token")
});

export const isAdminAtom = atom({
  key: 'isAdminAtom',
  default: !!window.localStorage.getItem("adminToken"),
});

// Admin States
export const userApproveListAtom = atom<User[]>({
  key: 'userApproveListAtom',
  default: [],
});

export const adminUploadedContentAtom = atom<adminVideoTypes[]>({
  key: 'adminUploadedContentAtom',
  default: [],
});

export const editContentAtom = atom<Video | null>({
  key: 'editContentAtom',
  default: null
});

export const globalLoadingAtom = atom<boolean>({
  key: "globalLoading",
  default: false
})