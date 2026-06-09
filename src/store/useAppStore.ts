import { create } from 'zustand';
import { deleteEntry, insertEntry, listEntriesByDate } from '../db/entryRepo';
import { getProfile, saveProfile } from '../db/profileRepo';
import { DailySummary, summarizeDay } from '../domain/calories';
import { Entry, UserProfile } from '../domain/types';
import { todayKey } from '../lib/date';
import { notifyOverThreshold } from '../lib/notify';

interface AppState {
  loaded: boolean;
  profile: UserProfile | null;
  date: string;
  entries: Entry[];
  summary: DailySummary | null;

  init: () => Promise<void>;
  reloadEntries: () => Promise<void>;
  addEntry: (e: Entry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateProfile: (p: UserProfile) => Promise<void>;
}

function recompute(profile: UserProfile | null, entries: Entry[]): DailySummary | null {
  return profile ? summarizeDay(entries, profile) : null;
}

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  profile: null,
  date: todayKey(),
  entries: [],
  summary: null,

  init: async () => {
    const profile = await getProfile();
    const date = todayKey();
    const entries = await listEntriesByDate(date);
    set({ loaded: true, profile, date, entries, summary: recompute(profile, entries) });
  },

  reloadEntries: async () => {
    const date = todayKey();
    const entries = await listEntriesByDate(date);
    set({ date, entries, summary: recompute(get().profile, entries) });
  },

  addEntry: async (e: Entry) => {
    const { profile, entries } = get();
    const before = profile ? summarizeDay(entries, profile) : null;

    await insertEntry(e);
    const next = [e, ...entries].sort((a, b) => b.createdAt - a.createdAt);
    const after = recompute(profile, next);
    set({ entries: next, summary: after });

    // 摄入从未超标变为超标时推送通知
    if (
      profile &&
      e.kind === 'intake' &&
      after?.overThreshold &&
      !(before?.overThreshold ?? false)
    ) {
      notifyOverThreshold(after.intake, profile.calorieThreshold).catch(() => {});
    }
  },

  removeEntry: async (id: string) => {
    await deleteEntry(id);
    const next = get().entries.filter((e) => e.id !== id);
    set({ entries: next, summary: recompute(get().profile, next) });
  },

  updateProfile: async (p: UserProfile) => {
    await saveProfile(p);
    set({ profile: p, summary: recompute(p, get().entries) });
  },
}));
