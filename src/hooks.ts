import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import { useState, useEffect, useMemo, useCallback } from "react"

import { useComponentSize as useCompSize } from "react-use-size/src/useComponentSize"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RefAndSize = [MutableRefObject<any>, { width: number; height: number }]

export function useComponentSize() {
  const { ref, width, height } = useCompSize()
  const size: RefAndSize = useMemo(() => [ref, { width, height }], [ref, width, height])
  return size
}

export function useClient() {
  const [client, setClient] = useState(false)
  useEffect(() => {
    setClient(true)
  }, [setClient])
  return client
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)
    const listener = () => setMatches(mediaQuery.matches)
    mediaQuery.addEventListener("change", listener)
    return () => mediaQuery.removeEventListener("change", listener)
  }, [query])
  return matches
}

export function useLocalStorage<T>(key: string, initialValue: T | undefined = undefined) {
  const [storedValue, setStoredValue] = useState<T | undefined>(undefined)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      setStoredValue(item ? JSON.parse(item) : initialValue)
    } catch (error) {
      console.error(error)
    }
  }, [key, initialValue])

  const setValue: Dispatch<SetStateAction<T | undefined>> = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (error) {
        console.error(error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

export function useKey(key: string, callback: () => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === key) {
        callback()
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [key, callback])
}

export function useMouse() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      setMouse({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener("mousemove", listener)
    return () => window.removeEventListener("mousemove", listener)
  }, [])
  return mouse
}
