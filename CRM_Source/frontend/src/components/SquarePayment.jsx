import { useState } from 'react'
import { useMutation } from 'react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material'
import api from '../services/api'

const SquarePayment = ({ open, onClose, invoice, onSuccess }) => {
  const [amount, setAmount] = useState(invoice?.balance || invoice?.total || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createPaymentMutation = useMutation(
    (data) => api.post('/square/create-payment', data),
    {
      onSuccess: async (response) => {
        try {
          // In a real implementation, you would use Square Web Payments SDK
          // For now, this is a placeholder that shows the integration point
          setLoading(true)
          
          // Simulate payment processing
          // In production, you would:
          // 1. Load Square Web Payments SDK
          // 2. Initialize the payment form
          // 3. Process payment through Square
          
          alert('Square payment integration ready. In production, this would process the payment through Square Web Payments SDK.')
          
          if (onSuccess) {
            onSuccess(response.data)
          }
          onClose()
        } catch (err) {
          setError(err.message || 'Payment processing failed')
        } finally {
          setLoading(false)
        }
      },
      onError: (err) => {
        setError(err.response?.data?.message || 'Failed to create payment')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    createPaymentMutation.mutate({
      invoice_id: invoice.id,
      amount: parseFloat(amount),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Pay with Square</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Square payment integration is configured. In production, this would use Square Web Payments SDK
              for secure payment processing.
            </Alert>

            <TextField
              label="Invoice Number"
              value={invoice?.invoice_number || ''}
              disabled
              fullWidth
            />

            <TextField
              label="Invoice Total"
              value={`$${invoice?.total?.toFixed(2) || '0.00'}`}
              disabled
              fullWidth
            />

            <TextField
              label="Current Balance"
              value={`$${invoice?.balance?.toFixed(2) || '0.00'}`}
              disabled
              fullWidth
            />

            <TextField
              label="Payment Amount"
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              inputProps={{ min: 0.01, max: invoice?.balance || invoice?.total, step: 0.01 }}
            />

            <Box sx={{ border: '1px dashed #ddd', p: 2, borderRadius: 1, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Note:</strong> This is a placeholder for Square Web Payments SDK integration.
                In production, this would display:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • Square payment form
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Secure card processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Payment processing through Square API
              </Typography>
            </Box>

            {error && (
              <Alert severity="error">{error}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || createPaymentMutation.isLoading}
          >
            {loading || createPaymentMutation.isLoading ? (
              <CircularProgress size={24} />
            ) : (
              'Process Payment'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default SquarePayment

