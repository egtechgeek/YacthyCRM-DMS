export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/+$/, '')}/backend/api`
  }

  return '/backend/api'
}

export const getBackendBaseUrl = () => {
  const apiBase = getApiBaseUrl()
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase
}


