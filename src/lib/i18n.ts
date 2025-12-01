export function detectLocale() {
  const nav = typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] || 'en' : 'en'
  const base = nav.split('-')[0].toLowerCase()
  return { locale: nav.toLowerCase(), base }
}

export function matchLanguage(languages: { value: string; label: string; code?: string }[]) {
  const { base } = detectLocale()
  const byCode = languages.find(l => (l.code || '').toLowerCase() === base)
  if (byCode) return byCode.value
  const byValue = languages.find(l => l.value.toLowerCase().startsWith(base))
  return byValue ? byValue.value : languages[0]?.value || ''
}
