import { useCallback, useState } from "react";

const STORAGE_KEY = "oyashiro-important";

function loadMarks(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    // ignore corrupt data
  }
  return new Set();
}

function saveMarks(marks: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...marks]));
}

export function useImportantMarks() {
  const [marks, setMarks] = useState(loadMarks);

  const toggle = useCallback((id: string) => {
    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveMarks(next);
      return next;
    });
  }, []);

  return { marks, toggle } as const;
}
