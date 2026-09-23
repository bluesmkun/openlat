import { useEffect, useState } from "react"

function read<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    raw = null
  }
  return raw && (valid as readonly string[]).includes(raw) ? (raw as T) : fallback
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function useStoredState<T extends string>(key: string, fallback: T, valid: readonly T[]) {
  const [value, setValue] = useState<T>(() => read(key, fallback, valid))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue] as const
}
