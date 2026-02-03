"use client"

import * as React from "react"
import {
  type Locale,
  type Translations,
  DEFAULT_LOCALE,
  loadTranslations,
  translate,
  getSavedLocale,
  saveLocale,
  getBrowserLocale,
} from "./index"

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
  isLoading: boolean
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const context = React.useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

interface I18nProviderProps {
  children: React.ReactNode
  defaultLocale?: Locale
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    // Try to get saved locale, then browser locale, then default
    const saved = getSavedLocale()
    if (saved) return saved
    return defaultLocale || getBrowserLocale()
  })
  
  const [translations, setTranslations] = React.useState<Translations>({})
  const [isLoading, setIsLoading] = React.useState(true)

  // Load translations when locale changes
  React.useEffect(() => {
    let cancelled = false
    
    async function load() {
      setIsLoading(true)
      const loaded = await loadTranslations(locale)
      if (!cancelled) {
        setTranslations(loaded)
        setIsLoading(false)
      }
    }
    
    load()
    
    return () => {
      cancelled = true
    }
  }, [locale])

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    saveLocale(newLocale)
  }, [])

  const t = React.useCallback(
    (key: string, params?: Record<string, string>) => {
      return translate(translations, key, params)
    },
    [translations]
  )

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      isLoading,
    }),
    [locale, setLocale, t, isLoading]
  )

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}
