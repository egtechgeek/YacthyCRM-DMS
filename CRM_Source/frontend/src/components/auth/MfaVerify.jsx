import { useState } from 'react'
import { mfaService } from '../../services/auth'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material'

const MfaVerify = ({ email, method, tempToken, onSuccess, onCancel }) => {
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [useEmailBackup, setUseEmailBackup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailCodeSent, setEmailCodeSent] = useState(false)

  const handleTotpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await mfaService.verifyLoginTotp(email, code)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailCodeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!emailCodeSent) {
        await mfaService.sendEmailCode(email)
        setEmailCodeSent(true)
        setError('')
        return
      }

      const response = await mfaService.verifyEmailCode(email, code)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecoveryCodeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await mfaService.verifyRecoveryCode(email, recoveryCode)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid recovery code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailCode = async () => {
    setError('')
    setLoading(true)

    try {
      await mfaService.sendEmailCode(email)
      setEmailCodeSent(true)
      setUseEmailBackup(true)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailCodeVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await mfaService.verifyEmailCode(email, code)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (method === 'totp') {
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
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              {useEmailBackup 
                ? 'Enter the 6-digit code sent to your email' 
                : 'Enter the 6-digit code from your authenticator app'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {emailCodeSent && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Verification code sent to {email}
              </Alert>
            )}

            <Box component="form" onSubmit={useEmailBackup ? handleEmailCodeVerify : handleTotpSubmit}>
              {(!useEmailBackup || emailCodeSent) && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="code"
                  label="6-Digit Code"
                  name="code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ maxLength: 6 }}
                />
              )}
              
              {useEmailBackup && !emailCodeSent ? (
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  onClick={handleSendEmailCode}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Send Code to Email'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? <CircularProgress size={24} /> : 'Verify'}
                </Button>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {!useEmailBackup && !useRecoveryCode && (
                  <>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={handleSendEmailCode}
                      disabled={loading}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      Send Code to Email (Backup)
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={() => setUseRecoveryCode(true)}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      Use Recovery Code
                    </Button>
                  </>
                )}

                {useEmailBackup && (
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => {
                      setUseEmailBackup(false)
                      setEmailCodeSent(false)
                      setCode('')
                    }}
                    sx={{ fontSize: '0.875rem' }}
                  >
                    Use Authenticator App
                  </Button>
                )}

                {useRecoveryCode && !useEmailBackup && (
                  <Box>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="recoveryCode"
                      label="Recovery Code"
                      name="recoveryCode"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 2, mb: 2 }}
                      onClick={handleRecoveryCodeSubmit}
                      disabled={loading || !recoveryCode}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Verify Recovery Code'}
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={() => {
                        setUseRecoveryCode(false)
                        setRecoveryCode('')
                      }}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      Use Authenticator App
                    </Button>
                  </Box>
                )}
              </Box>

              <Button fullWidth variant="text" onClick={onCancel} sx={{ mt: 2 }}>
                Cancel
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    )
  }

  if (method === 'email') {
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
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Email Verification
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              {emailCodeSent
                ? 'Enter the 6-digit code sent to your email'
                : 'Click the button below to receive a verification code'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {emailCodeSent && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Code sent to {email}
              </Alert>
            )}

            <Box component="form" onSubmit={handleEmailCodeSubmit}>
              {emailCodeSent && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="code"
                  label="6-Digit Code"
                  name="code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ maxLength: 6 }}
                />
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : emailCodeSent ? (
                  'Verify Code'
                ) : (
                  'Send Verification Code'
                )}
              </Button>
              <Button fullWidth variant="text" onClick={onCancel}>
                Cancel
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

  return null
}

export default MfaVerify

