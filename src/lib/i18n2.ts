import { useEffect } from 'react'
import { useSettings, loadSettings } from '../store/settings'

/** Small hook to read the interface language (English / Swahili). */
export function useLanguage() {
  const language = useSettings((s) => s.language)
  useEffect(() => {
    void loadSettings()
  }, [])
  const setLanguage = (l: 'en' | 'sw') => {
    useSettings.setState({ language: l })
    document.documentElement.lang = l
  }
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return { language, setLanguage }
}
