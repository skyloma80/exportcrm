/**
 * i18n Core Module
 * 
 * Lightweight internationalization solution for the template app.
 * Supports dynamic language loading and key fallback.
 */

export type Locale = 'en' | 'zh'

export const DEFAULT_LOCALE: Locale = 'en'
export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh']
export const LOCALE_STORAGE_KEY = 'app-locale'

export interface Translations {
  [key: string]: string | Translations
}

// Cache for loaded translations
const translationsCache: Map<Locale, Translations> = new Map()

/**
 * Dynamically load translations for a locale
 */
export async function loadTranslations(locale: Locale): Promise<Translations> {
  // Check cache first
  if (translationsCache.has(locale)) {
    return translationsCache.get(locale)!
  }

  try {
    // Dynamic import of locale file
    const translations = await import(`./locales/${locale}.json`)
    translationsCache.set(locale, translations.default || translations)
    return translations.default || translations
  } catch (error) {
    console.warn(`Failed to load translations for locale: ${locale}`, error)
    // Fallback to empty object
    return {}
  }
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split('.')
  let current: any = obj

  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[key]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Translate a key with optional parameter substitution
 */
export function translate(
  translations: Translations,
  key: string,
  params?: Record<string, string>
): string {
  const value = getNestedValue(translations, key)

  // Fallback to key if translation not found
  if (value === undefined) {
    return key
  }

  // Replace parameters if provided - support both {{key}} and {key} formats
  if (params) {
    let result = value
    for (const [paramKey, paramValue] of Object.entries(params)) {
      // Escape $ as $$ for regex replacement ($ has special meaning in replacement strings)
      const escapedValue = paramValue.replace(/\$/g, '$$$$')
      result = result
        .replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), escapedValue)
        .replace(new RegExp(`\\{${paramKey}\\}`, 'g'), escapedValue)
    }
    return result
  }

  return value
}

/**
 * Get saved locale from storage
 */
export function getSavedLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
    return saved as Locale
  }
  return null
}

/**
 * Save locale to storage
 */
export function saveLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

/**
 * Get browser's preferred locale
 */
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  
  const browserLang = navigator.language.split('-')[0]
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale
  }
  return DEFAULT_LOCALE
}
