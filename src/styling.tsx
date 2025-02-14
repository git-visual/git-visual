import { type ClassValue, clsx } from "clsx"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { createContext, useContext } from "react"
import { useLocalStorage } from "~/hooks"
import { twMerge } from "tailwind-merge"

export const cn = (...args: ClassValue[]) => twMerge(clsx(args))

export const Themes = {
  LIGHT: "Light",
  DARK: "Dark"
} as const

export type Theme = keyof typeof Themes

export const ThemeContext = createContext<[Theme, Dispatch<SetStateAction<Theme | undefined>>]>([
  "LIGHT",
  () => {
    throw new Error("ThemeContext not in the tree")
  }
])

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useLocalStorage<Theme>("themeType", undefined)

  return (
    <ThemeContext.Provider value={[theme === undefined ? "LIGHT" : theme, setTheme]}>{children}</ThemeContext.Provider>
  )
}

export function usePrefersLightMode() {
  // const prefersLight = useMQPrefersColorSchemeLight()
  const [theme] = useTheme()

  return theme === undefined || theme === "LIGHT"
}
