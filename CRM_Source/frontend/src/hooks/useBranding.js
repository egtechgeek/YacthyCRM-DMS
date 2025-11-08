import { useQuery } from 'react-query'
import api from '../services/api'

const fetchBranding = async () => {
  const response = await api.get('/branding')
  return response.data
}

const useBranding = (options = {}) => {
  return useQuery('branding-profile', fetchBranding, {
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 15,
    ...options,
  })
}

export default useBranding

