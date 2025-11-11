import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
} from '@mui/material'
import useCachedBranding from '../../hooks/useCachedBranding'
import { getBackendBaseUrl } from '../../utils/url'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()
  const { branding } = useCachedBranding()

  const baseApiUrl = useMemo(() => {
    return getBackendBaseUrl()
  }, [])

  const registerLogoSrc = useMemo(() => {
    if (!branding) return null
    if (branding.logo_login) {
      return `${baseApiUrl}/storage/${branding.logo_login}`
    }
    if (branding.logo_header) {
      return `${baseApiUrl}/storage/${branding.logo_header}`
    }
    if (branding.logo_invoice) {
      return `${baseApiUrl}/storage/${branding.logo_invoice}`
    }
    return null
  }, [branding, baseApiUrl])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await register(formData)
      setSuccess(response?.message || 'Registration submitted successfully.')
      setFormData({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
      })
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
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
            {registerLogoSrc ? (
              <img
                src={registerLogoSrc}
                alt={`${branding?.crm_name || 'CRM'} Logo`}
                style={{ height: '80px', maxWidth: '300px', objectFit: 'contain' }}
              />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {branding?.crm_name || 'CRM'}
              </Typography>
            )}
          </Box>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Register
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
              {success} You will be able to sign in once an administrator activates your account.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password_confirmation"
              label="Confirm Password"
              type="password"
              id="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
            <Box textAlign="center">
              <MuiLink component={Link} to="/login" variant="body2">
                Already have an account? Sign in
              </MuiLink>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Register

