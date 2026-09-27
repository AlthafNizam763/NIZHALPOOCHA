'use client';
import { create } from 'zustand';
import type { RoomSnapshot } from '@muchiri/shared';

interface RoomState {
  room: RoomSnapshot | null;
  setRoom: (room: RoomSnapshot | null) => void;
}

export const useRoom = create<RoomState>()((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
}));
