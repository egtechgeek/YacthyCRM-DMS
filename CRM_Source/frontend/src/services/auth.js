import api from './api'
import axios from 'axios'
import { getBackendBaseUrl } from '../utils/url'

// Get CSRF cookie before making authenticated requests
const getCsrfCookie = async () => {
  const baseUrl = getBackendBaseUrl()
  await axios.get(`${baseUrl}/sanctum/csrf-cookie`, {
    withCredentials: true
  })
}

export const authService = {
  register: async (data) => {
    await getCsrfCookie()
    const response = await api.post('/register', data)
    return response.data
  },

  login: async (email, password) => {
    await getCsrfCookie()
    const response = await api.post('/login', { email, password })
    return response.data
  },

  logout: async () => {
    await api.post('/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getUser: async () => {
    const response = await api.get('/user')
    return response.data
  },

  forgotPassword: async (email) => {
    const response = await api.post('/forgot-password', { email })
    return response.data
  },

  resetPassword: async (data) => {
    const response = await api.post('/reset-password', data)
    return response.data
  },
}

export const mfaService = {
  getStatus: async () => {
    const response = await api.get('/mfa/status')
    return response.data
  },

  setupTotp: async () => {
    const response = await api.post('/mfa/setup-totp')
    return response.data
  },

  verifyTotp: async (code) => {
    const response = await api.post('/mfa/verify-totp', { code })
    return response.data
  },

  verifyLoginTotp: async (email, code) => {
    const response = await api.post('/mfa/verify-totp-login', { email, code })
    return response.data
  },

  sendEmailCode: async (email) => {
    const response = await api.post('/mfa/send-email-code', { email })
    return response.data
  },

  verifyEmailCode: async (email, code) => {
    const response = await api.post('/mfa/verify-email-code', { email, code })
    return response.data
  },

  enableEmail2fa: async () => {
    const response = await api.post('/mfa/enable-email')
    return response.data
  },

  disableMfa: async () => {
    const response = await api.post('/mfa/disable')
    return response.data
  },

  verifyRecoveryCode: async (email, recoveryCode) => {
    const response = await api.post('/mfa/verify-recovery-code', { email, recoveryCode })
    return response.data
  },

  regenerateRecoveryCodes: async () => {
    const response = await api.post('/mfa/regenerate-recovery-codes')
    return response.data
  },
}

