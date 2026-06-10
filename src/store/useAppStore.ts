import { create } from 'zustand';
import { getDailyActivity, setDailyActivity } from '../db/dailyActivityRepo';
import { deleteEntry, insertEntry, listEntriesByDate } from '../db/entryRepo';
import { getProfile, saveProfile } from '../db/profileRepo';
import { DailySummary, summarizeDay } from '../domain/calories';
import { DEFAULT_ACTIVITY_FACTOR, Entry, UserProfile } from '../domain/types';
import { todayKey } from '../lib/date';
import { notifyOverThreshold } from '../lib/notify';

interface AppState {
  loaded: boolean;
  profile: UserProfile | null;
  date: string;
  entries: Entry[];
  activityFactor: number; // 当前 date 的活动系数
  summary: DailySummary | null;

  init: () => Promise<void>;
  reloadEntries: () => Promise<void>;
  addEntry: (e: Entry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateProfile: (p: UserProfile) => Promise<void>;
  setActivityFactor: (factor: number) => Promise<void>;
}

function recompute(
  profile: UserProfile | null,
  entries: Entry[],
  factor: number
): DailySummary | null {
  return profile ? summarizeDay(entries, profile, factor) : null;
}

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  profile: null,
  date: todayKey(),
  entries: [],
  activityFactor: DEFAULT_ACTIVITY_FACTOR,
  summary: null,

  init: async () => {
    const profile = await getProfile();
    const date = todayKey();
    const entries = await listEntriesByDate(date);
    const factor = (await getDailyActivity(date)) ?? DEFAULT_ACTIVITY_FACTOR;
    set({
      loaded: true,
      profile,
      date,
      entries,
      activityFactor: factor,
      summary: recompute(profile, entries, factor),
    });
  },

  reloadEntries: async () => {
    const date = todayKey();
    const entries = await listEntriesByDate(date);
    const factor = (await getDailyActivity(date)) ?? DEFAULT_ACTIVITY_FACTOR;
    set({
      date,
      entries,
      activityFactor: factor,
      summary: recompute(get().profile, entries, factor),
    });
  },

  addEntry: async (e: Entry) => {
    const { profile, entries, activityFactor } = get();
    const before = profile ? summarizeDay(entries, profile, activityFactor) : null;

    await insertEntry(e);
    const next = [e, ...entries].sort((a, b) => b.createdAt - a.createdAt);
    const after = recompute(profile, next, activityFactor);
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
    set({ entries: next, summary: recompute(get().profile, next, get().activityFactor) });
  },

  updateProfile: async (p: UserProfile) => {
    await saveProfile(p);
    set({ profile: p, summary: recompute(p, get().entries, get().activityFactor) });
  },

  setActivityFactor: async (factor: number) => {
    const date = get().date;
    await setDailyActivity(date, factor);
    set({ activityFactor: factor, summary: recompute(get().profile, get().entries, factor) });
  },
}));
