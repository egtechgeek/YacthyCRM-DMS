import { useState, useEffect, useMemo } from 'react'
import useBranding from './useBranding'

const STORAGE_KEY = 'branding-cache-v1'

const getCachedBranding = () => {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.warn('Failed to parse cached branding', error)
    return null
  }
}

const useCachedBranding = () => {
  const { data, isLoading, error } = useBranding()
  const [cachedBranding, setCachedBranding] = useState(getCachedBranding)

  useEffect(() => {
    if (!data) return

    setCachedBranding(data)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (err) {
        console.warn('Failed to cache branding', err)
      }
    }
  }, [data])

  const branding = useMemo(() => {
    return data || cachedBranding || null
  }, [data, cachedBranding])

  return {
    branding,
    isLoading,
    error,
  }
}

export default useCachedBranding

