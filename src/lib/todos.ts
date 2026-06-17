import type { TodoItem } from '@/types';

/**
 * Notes are stored in users.remarks. We persist a to-do checklist as a JSON
 * array there. Legacy plain-text remarks are shown as a single unchecked item.
 */
export function parseTodos(remarks: string | null | undefined): TodoItem[] {
  if (!remarks) return [];
  try {
    const parsed = JSON.parse(remarks);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x && typeof x.text === 'string')
        .map((x) => ({ text: x.text, done: !!x.done }));
    }
  } catch {
    // not JSON — treat the whole string as one note
  }
  return [{ text: remarks, done: false }];
}

export function serializeTodos(todos: TodoItem[]): string {
  const clean = todos.map((t) => ({ text: t.text.trim(), done: t.done })).filter((t) => t.text);
  return clean.length ? JSON.stringify(clean) : '';
}
