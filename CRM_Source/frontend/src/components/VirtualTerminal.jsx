import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete,
  Grid,
  Typography,
  Divider,
} from '@mui/material'
import { CreditCard as CardIcon } from '@mui/icons-material'
import api from '../services/api'

const VirtualTerminal = ({ open, onClose, onSuccess }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_provider: 'manual',
    amount: '',
    card_number: '',
    card_exp_month: '',
    card_exp_year: '',
    card_cvv: '',
    cardholder_name: '',
    billing_zip: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data: invoices } = useQuery('unpaid-invoices', async () => {
    const response = await api.get('/invoices', { params: { status: 'sent,overdue' } })
    return response.data
  })

  const { data: settings } = useQuery('system-settings', async () => {
    const response = await api.get('/settings')
    return response.data
  })

  const processMutation = useMutation(
    (data) => api.post('/payments/virtual-terminal', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments')
        if (onSuccess) onSuccess()
        alert('Payment processed successfully')
        handleReset()
        onClose()
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Payment processing failed')
      },
    }
  )

  const handleReset = () => {
    setFormData({
      invoice_id: '',
      payment_provider: 'manual',
      amount: '',
      card_number: '',
      card_exp_month: '',
      card_exp_year: '',
      card_cvv: '',
      cardholder_name: '',
      billing_zip: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    processMutation.mutate({
      ...formData,
      invoice_id: parseInt(formData.invoice_id),
      amount: parseFloat(formData.amount),
      processed_at: formData.payment_date,
    })
  }

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ')
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i)

  const isStripeEnabled = settings?.data?.stripe_enabled?.value
  const isSquareEnabled = settings?.data?.square_enabled?.value

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CardIcon />
            Virtual Terminal - Manual Payment Processing
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {!isStripeEnabled && !isSquareEnabled && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>Manual Mode Only</strong><br />
                Live payment processing is disabled. Enable Stripe or Square in System Settings for live card processing.
              </Alert>
            )}
            
            {(isStripeEnabled || isSquareEnabled) && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Virtual Terminal Ready</strong><br />
                Select "Manual Entry" to record payments for reference, or choose a payment provider to process live card transactions.
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={invoices?.data || []}
                  getOptionLabel={(option) => `${option.invoice_number} - ${option.customer?.name} ($${option.balance?.toFixed(2)})`}
                  renderInput={(params) => <TextField {...params} label="Select Invoice" required />}
                  value={invoices?.data?.find(inv => inv.id === parseInt(formData.invoice_id)) || null}
                  onChange={(e, newValue) => {
                    setFormData({
                      ...formData,
                      invoice_id: newValue?.id || '',
                      amount: newValue?.balance || '',
                    })
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Payment Date"
                  type="date"
                  fullWidth
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.payment_provider}
                    label="Payment Method"
                    onChange={(e) => setFormData({ ...formData, payment_provider: e.target.value })}
                  >
                    <MenuItem value="manual">Manual Entry (Record Only)</MenuItem>
                    {isStripeEnabled && <MenuItem value="stripe">Stripe (Live Processing)</MenuItem>}
                    {isSquareEnabled && <MenuItem value="square">Square (Live Processing)</MenuItem>}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider />
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 2 }}>
                  Card Information
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Cardholder Name"
                  fullWidth
                  required
                  value={formData.cardholder_name}
                  onChange={(e) => setFormData({ ...formData, cardholder_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Card Number"
                  fullWidth
                  required
                  value={formData.card_number}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value.replace(/\s/g, ''))
                    if (formatted.replace(/\s/g, '').length <= 16) {
                      setFormData({ ...formData, card_number: formatted })
                    }
                  }}
                  placeholder="1234 5678 9012 3456"
                  inputProps={{ maxLength: 19 }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Exp Month</InputLabel>
                  <Select
                    value={formData.card_exp_month}
                    label="Exp Month"
                    onChange={(e) => setFormData({ ...formData, card_exp_month: e.target.value })}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <MenuItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Exp Year</InputLabel>
                  <Select
                    value={formData.card_exp_year}
                    label="Exp Year"
                    onChange={(e) => setFormData({ ...formData, card_exp_year: e.target.value })}
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year.toString()}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="CVV"
                  fullWidth
                  required
                  value={formData.card_cvv}
                  onChange={(e) => {
                    if (/^\d{0,4}$/.test(e.target.value)) {
                      setFormData({ ...formData, card_cvv: e.target.value })
                    }
                  }}
                  inputProps={{ maxLength: 4 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Billing ZIP Code"
                  fullWidth
                  required
                  value={formData.billing_zip}
                  onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  inputProps={{ step: '0.01', min: 0 }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  fullWidth
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>

            {formData.payment_provider === 'manual' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Manual Entry Mode:</strong> Card information will be stored for record-keeping only. 
                No actual card processing will occur.
              </Alert>
            )}

            {(formData.payment_provider === 'stripe' || formData.payment_provider === 'square') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Live Processing:</strong> This will charge the card immediately through {formData.payment_provider}.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleReset} disabled={processMutation.isLoading}>
            Clear
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={processMutation.isLoading}
            startIcon={processMutation.isLoading ? <CircularProgress size={20} /> : <CardIcon />}
          >
            {processMutation.isLoading ? 'Processing...' : 'Process Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default VirtualTerminal

