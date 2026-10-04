import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { getLocale, locales, setLocale, type Locale } from '@/paraglide/runtime'

/** Endonyms: each language is named in itself, whatever the current locale. */
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
}

/**
 * Compact FR / EN toggle. The choice is saved in localStorage by Paraglide, and the page
 * reloads in the new language (Paraglide's model: no reactive locale state in React).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = getLocale()

  return (
    <div role="group" aria-label={m.language()} className={cn('flex text-xs', className)}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          title={LANGUAGE_NAMES[locale]}
          aria-pressed={locale === current}
          onClick={() => locale !== current && setLocale(locale)}
          className={cn(
            'rounded-sm px-1.5 py-1 font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-font-clear',
            locale === current && 'text-font-clear',
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
