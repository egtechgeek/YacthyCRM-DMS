import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Stack,
  Alert,
} from '@mui/material'
import { useMutation } from 'react-query'
import api from '../services/api'

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!?'
  let password = ''
  for (let i = 0; i < 12; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

const InviteCustomerDialog = ({ open, onClose, customer }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const customerName = useMemo(() => customer?.name ?? '', [customer])

  useEffect(() => {
    if (open) {
      const initialPassword = generatePassword()
      setPassword(initialPassword)
      setConfirmPassword(initialPassword)
      setErrorMessage('')
    }
  }, [open])

  const inviteMutation = useMutation(
    async ({ customerId, password: invitePassword }) => {
      return api.post('/email/send-invitation', {
        customer_id: customerId,
        password: invitePassword,
      })
    },
    {
      onSuccess: () => {
        alert('Invitation email sent successfully.')
        onClose?.()
      },
      onError: (error) => {
        const message =
          error?.response?.data?.message ||
          'Failed to send invitation. Please try again.'
        setErrorMessage(message)
      },
    }
  )

  const handleGeneratePassword = () => {
    const newPassword = generatePassword()
    setPassword(newPassword)
    setConfirmPassword(newPassword)
    setErrorMessage('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!customer?.id) {
      setErrorMessage('No customer selected for invitation.')
      return
    }
    if (!password) {
      setErrorMessage('Password is required.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.')
      return
    }

    setErrorMessage('')
    inviteMutation.mutate({
      customerId: customer.id,
      password,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!inviteMutation.isLoading) {
          onClose?.()
        }
      }}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>Send Customer Invitation</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body1">
              Send an invitation email to{' '}
              <strong>{customerName || 'the selected customer'}</strong>. The
              invite will include a temporary password you specify below.
            </Typography>

            <TextField
              label="Customer Email"
              value={customer?.email ?? ''}
              InputProps={{ readOnly: true }}
            />

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Temporary Password"
                type="text"
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={inviteMutation.isLoading}
              />
              <Button
                variant="outlined"
                onClick={handleGeneratePassword}
                disabled={inviteMutation.isLoading}
              >
                Generate
              </Button>
            </Stack>

            <TextField
              label="Confirm Password"
              type="text"
              fullWidth
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={inviteMutation.isLoading}
            />

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!inviteMutation.isLoading) {
                onClose?.()
              }
            }}
            disabled={inviteMutation.isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={inviteMutation.isLoading}
          >
            {inviteMutation.isLoading ? 'Sending…' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default InviteCustomerDialog


