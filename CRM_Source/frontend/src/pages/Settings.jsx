import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography as MuiTypography,
  Stack,
  Link,
} from '@mui/material'
import { Security as SecurityIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Settings = () => {
  const { user } = useAuth()
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)

  const { data: mfaStatus } = useQuery('mfa-status', async () => {
    const response = await api.get('/mfa/status')
    return response.data
  }, {
    enabled: !!user,
  })

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Profile Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name"
              fullWidth
              value={user?.name || ''}
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              fullWidth
              value={user?.email || ''}
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Role"
              fullWidth
              value={
                user?.role === 'office_staff' ? 'Office Staff' :
                user?.role === 'employee' ? 'Employee' :
                user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || ''
              }
              disabled
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">Multi-Factor Authentication</Typography>
            <Typography variant="body2" color="text.secondary">
              {mfaStatus?.mfa_enabled ? 'MFA is enabled' : 'MFA is disabled'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<SecurityIcon />}
            onClick={() => setMfaDialogOpen(true)}
          >
            {mfaStatus?.mfa_enabled ? 'Manage MFA' : 'Setup MFA'}
          </Button>
        </Box>
      </Paper>

      <MfaDialog
        open={mfaDialogOpen}
        onClose={() => setMfaDialogOpen(false)}
        mfaStatus={mfaStatus}
      />
    </Container>
  )
}

const MfaDialog = ({ open, onClose, mfaStatus }) => {
  const [setupStep, setSetupStep] = useState('method')
  const [method, setMethod] = useState('totp')
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [qrCodeImage, setQrCodeImage] = useState(null)
  const [secretKey, setSecretKey] = useState(null)
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [verificationCode, setVerificationCode] = useState('')

  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) {
      setSetupStep('method')
      setMethod('totp')
      setQrCodeUrl(null)
      setQrCodeImage(null)
      setSecretKey(null)
      setRecoveryCodes([])
      setVerificationCode('')
    }
  }, [open])

  const setupMutation = useMutation(
    () => api.post('/mfa/setup-totp'),
    {
      onSuccess: (response) => {
        const { qr_code_url: totpUrl, secret } = response.data
        setQrCodeUrl(totpUrl)
        const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(totpUrl)}`
        setQrCodeImage(qrImage)
        setSecretKey(secret)
        setSetupStep('verify')
      },
    }
  )

  const verifyMutation = useMutation(
    (code) => api.post('/mfa/verify-totp', { code }),
    {
      onSuccess: (response) => {
        setRecoveryCodes(response.data.recovery_codes || [])
        setSetupStep('complete')
        queryClient.invalidateQueries('mfa-status')
      },
    }
  )

  const disableMutation = useMutation(
    () => api.post('/mfa/disable'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('mfa-status')
        onClose()
      },
    }
  )

  const handleSetup = () => {
    if (method === 'totp') {
      setupMutation.mutate()
    }
  }

  const handleVerify = () => {
    verifyMutation.mutate(verificationCode)
  }

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable MFA?')) {
      disableMutation.mutate()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mfaStatus?.mfa_enabled ? 'Manage MFA' : 'Setup Multi-Factor Authentication'}
      </DialogTitle>
      <DialogContent>
        {mfaStatus?.mfa_enabled ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              MFA is currently enabled using {mfaStatus.mfa_method}
            </Alert>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisable}
              disabled={disableMutation.isLoading}
              fullWidth
            >
              {disableMutation.isLoading ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </Box>
        ) : setupStep === 'method' ? (
          <Box>
            <MuiTypography variant="body1" gutterBottom>
              Select an MFA method:
            </MuiTypography>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleSetup}
              disabled={setupMutation.isLoading}
            >
              {setupMutation.isLoading ? 'Setting up...' : 'Setup Google Authenticator / Microsoft Authenticator'}
            </Button>
          </Box>
        ) : setupStep === 'verify' ? (
          <Box>
            <Stack spacing={2} sx={{ mb: 2 }}>
              {qrCodeImage && (
                <Box sx={{ textAlign: 'center' }}>
                  <img src={qrCodeImage} alt="Authenticator QR Code" style={{ maxWidth: '100%', borderRadius: 8 }} />
                  <MuiTypography variant="body2" sx={{ mt: 1 }}>
                    Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app.
                  </MuiTypography>
                </Box>
              )}
              {qrCodeUrl && (
                <MuiTypography variant="body2" align="center">
                  Having trouble scanning?{' '}
                  <Link href={qrCodeUrl} underline="hover">
                    Open setup link
                  </Link>
                </MuiTypography>
              )}
              {secretKey && (
                <Box sx={{ textAlign: 'center' }}>
                  <MuiTypography variant="body2" sx={{ mb: 0.5 }}>
                    Or enter this secret manually:
                  </MuiTypography>
                  <Box
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: '#f5f5f5',
                      px: 2,
                      py: 1,
                      display: 'inline-block',
                      borderRadius: 1,
                    }}
                  >
                    {secretKey.replace(/(.{4})/g, '$1 ').trim()}
                  </Box>
                </Box>
              )}
            </Stack>
            <TextField
              label="Verification Code"
              fullWidth
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              sx={{ mb: 2 }}
              helperText="Enter the 6-digit code from your authenticator app"
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleVerify}
              disabled={verifyMutation.isLoading || !verificationCode}
            >
              {verifyMutation.isLoading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </Box>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              <MuiTypography variant="body1" fontWeight="bold" gutterBottom>
                MFA has been successfully enabled!
              </MuiTypography>
            </Alert>
            {recoveryCodes.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <MuiTypography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Save these recovery codes in a safe place!
                </MuiTypography>
                <MuiTypography variant="body2" gutterBottom>
                  You'll need these if you lose access to your authenticator app.
                </MuiTypography>
                <Box sx={{ 
                  backgroundColor: '#f5f5f5', 
                  p: 2, 
                  borderRadius: 1, 
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  mt: 1
                }}>
                  {recoveryCodes.map((code, idx) => (
                    <Box key={idx} sx={{ mb: 0.5 }}>
                      {idx + 1}. {code}
                    </Box>
                  ))}
                </Box>
              </Alert>
            )}
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                onClose()
                setSetupStep('method')
                setVerificationCode('')
              }}
            >
              Done
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default Settings

