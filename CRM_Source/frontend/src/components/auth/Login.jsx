import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import MfaVerify from './MfaVerify'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material'
import useCachedBranding from '../../hooks/useCachedBranding'
import { getBackendBaseUrl } from '../../utils/url'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaMethod, setMfaMethod] = useState(null)
  const [tempToken, setTempToken] = useState(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const { branding } = useCachedBranding()

  const baseApiUrl = useMemo(() => getBackendBaseUrl(), [])

  const loginLogoSrc = useMemo(() => {
    if (!branding) return null
    if (branding.logo_login) {
      return `${baseApiUrl}/storage/${branding.logo_login}`
    }
    if (branding.logo_header) {
      return `${baseApiUrl}/storage/${branding.logo_header}`
    }
    return null
  }, [branding, baseApiUrl])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)

      if (result.mfaRequired) {
        setMfaRequired(true)
        setMfaMethod(result.mfaMethod)
        setTempToken(result.tempToken)
        setLoading(false) // Stop loading when switching to MFA
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      // Handle validation errors
      setLoading(false) // Stop loading immediately on error
      
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors
        const errorMessages = Object.values(errors).flat().join(', ')
        setError(errorMessages)
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.')
      }
      console.error('Login error:', err.response?.data)
    }
  }

  if (mfaRequired) {
    return (
      <MfaVerify
        email={email}
        method={mfaMethod}
        tempToken={tempToken}
        onSuccess={() => navigate('/dashboard')}
        onCancel={() => {
          setMfaRequired(false)
          setMfaMethod(null)
          setTempToken(null)
        }}
      />
    )
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            {loginLogoSrc ? (
              <img
                src={loginLogoSrc}
                alt={`${branding?.crm_name || 'CRM'} Logo`}
                style={{ height: '160px', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Box sx={{ height: 160, width: '100%', maxWidth: 260 }} />
            )}
          </Box>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            {branding?.crm_name || 'CRM'}
          </Typography>
          <Typography component="h2" variant="h6" align="center" gutterBottom>
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            An E G Tech Solutions LLC™ System © 2025
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}

export default Login

