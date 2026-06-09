/** 轻量唯一 ID（本地使用足够） */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
