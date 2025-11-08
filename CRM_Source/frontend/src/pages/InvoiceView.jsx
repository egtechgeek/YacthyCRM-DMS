import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  CreditCard as StripeIcon,
} from '@mui/icons-material'
import api from '../services/api'
import StripePayment from '../components/StripePayment'
import SquarePayment from '../components/SquarePayment'
import { useAssetLabels } from '../context/AssetLabelContext'
import useBranding from '../hooks/useBranding'
import BusinessIdentity from '../components/BusinessIdentity'

const getVehicleDisplayName = (vehicle) => {
  if (!vehicle) return '-'
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean)
  return parts.length ? parts.join(' ') : vehicle.name || '-'
}

const InvoiceView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const assetLabels = useAssetLabels()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [stripeDialogOpen, setStripeDialogOpen] = useState(false)
  const [squareDialogOpen, setSquareDialogOpen] = useState(false)

  const { data: invoiceResponse, isLoading, error } = useQuery(['invoice', id], async () => {
    const response = await api.get(`/invoices/${id}`)
    return response.data
  })

  const invoice = invoiceResponse?.invoice || invoiceResponse
  const brandingFromInvoice = invoiceResponse?.branding
  const { data: fallbackBranding } = useBranding({ enabled: !brandingFromInvoice })
  const branding = brandingFromInvoice || fallbackBranding

  const sendEmailMutation = useMutation(
    () => api.post(`/emails/send-invoice`, { invoice_id: id }),
    {
      onSuccess: () => {
        alert('Invoice email sent successfully')
      },
    }
  )

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'error',
      cancelled: 'default',
    }
    return colors[status] || 'default'
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/invoices/${id}/download-pdf`, {
        responseType: 'blob',
      })
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice_${invoice?.invoice_number || id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to download PDF: ' + (error.response?.data?.message || error.message))
    }
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error || !invoice) {
    return (
      <Container>
        <Alert severity="error">Invoice not found</Alert>
        <Button onClick={() => navigate('/invoices')} sx={{ mt: 2 }}>
          Back to Invoices
        </Button>
      </Container>
    )
  }

  const assetInfo = invoice.vehicle
    ? {
        type: 'vehicle',
        name: getVehicleDisplayName(invoice.vehicle),
        details: [
          { label: 'VIN', value: invoice.vehicle.vin || '-' },
          { label: 'Coach #', value: invoice.vehicle.coach_number || '-' },
          { label: 'Status', value: invoice.vehicle.status || '-' },
        ],
      }
    : invoice.yacht
    ? {
        type: 'yacht',
        name: invoice.yacht.name || '-',
        details: [
          { label: 'Type', value: invoice.yacht.type || '-' },
          { label: 'HIN', value: invoice.yacht.hull_identification_number || '-' },
        ],
      }
    : null

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/invoices')}>
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => sendEmailMutation.mutate()}
            disabled={sendEmailMutation.isLoading}
          >
            Send Email
          </Button>
          {invoice.balance > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Record Payment
              </Button>
              <Button
                variant="outlined"
                startIcon={<StripeIcon />}
                onClick={() => setStripeDialogOpen(true)}
              >
                Pay with Stripe
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSquareDialogOpen(true)}
              >
                Pay with Square
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        {branding && (
          <BusinessIdentity branding={branding} title="Issued By" sx={{ mb: 3 }} />
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h4">Invoice #{invoice.invoice_number}</Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(invoice.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip label={invoice.status} color={getStatusColor(invoice.status)} />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Customer Information</Typography>
            <Typography><strong>Name:</strong> {invoice.customer?.name}</Typography>
            <Typography><strong>Email:</strong> {invoice.customer?.email || '-'}</Typography>
            <Typography><strong>Phone:</strong> {invoice.customer?.phone || '-'}</Typography>
            {(invoice.customer?.billing_address || invoice.customer?.billing_city || invoice.customer?.billing_state || invoice.customer?.billing_zip) && (
              <Box sx={{ mt: 1 }}>
                {invoice.customer?.billing_address && (
                  <Typography variant="body2">{invoice.customer.billing_address}</Typography>
                )}
                {(invoice.customer?.billing_city || invoice.customer?.billing_state || invoice.customer?.billing_zip) && (
                  <Typography variant="body2">
                    {[invoice.customer?.billing_city, invoice.customer?.billing_state].filter(Boolean).join(', ')}
                    {invoice.customer?.billing_zip ? ` ${invoice.customer.billing_zip}` : ''}
                  </Typography>
                )}
              </Box>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            {assetInfo && (
              <>
                <Typography variant="h6" gutterBottom>{assetLabels.singular} Information</Typography>
                <Typography><strong>Name:</strong> {assetInfo.name}</Typography>
                {assetInfo.details.map((detail) => (
                  <Typography key={detail.label}><strong>{detail.label}:</strong> {detail.value}</Typography>
                ))}
              </>
            )}
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Issue Date:</strong> {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</Typography>
              <Typography><strong>Due Date:</strong> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Line Items</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Discount</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.item_type === 'part' ? 'Part' : 'Service'}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">${item.unit_price?.toFixed(2)}</TableCell>
                    <TableCell align="right">${item.discount?.toFixed(2)}</TableCell>
                    <TableCell align="right">${item.total?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Box sx={{ minWidth: 300 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>${invoice.subtotal?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Tax ({invoice.tax_rate}%):</Typography>
              <Typography>${invoice.tax_amount?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderTop: '1px solid #ddd', pt: 1 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">${invoice.total?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Paid:</Typography>
              <Typography color="success.main">${invoice.paid_amount?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', pt: 1 }}>
              <Typography variant="h6" color={invoice.balance > 0 ? 'error' : 'success.main'}>
                Balance:
              </Typography>
              <Typography variant="h6" color={invoice.balance > 0 ? 'error' : 'success.main'}>
                ${invoice.balance?.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>

        {invoice.payments && invoice.payments.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Payment History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.processed_at ? new Date(payment.processed_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{payment.payment_method?.name || payment.payment_method_type || '-'}</TableCell>
                      <TableCell>{payment.payment_provider || 'Offline'}</TableCell>
                      <TableCell align="right">${payment.amount?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          color={payment.status === 'completed' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {invoice.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>Notes</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {invoice.notes}
            </Typography>
          </Box>
        )}
      </Paper>

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        invoiceId={id}
        onSuccess={() => {
          queryClient.invalidateQueries(['invoice', id])
          queryClient.invalidateQueries('invoices')
        }}
      />

      <StripePayment
        open={stripeDialogOpen}
        onClose={() => setStripeDialogOpen(false)}
        invoice={invoice}
        onSuccess={() => {
          queryClient.invalidateQueries(['invoice', id])
          queryClient.invalidateQueries('invoices')
        }}
      />

      <SquarePayment
        open={squareDialogOpen}
        onClose={() => setSquareDialogOpen(false)}
        invoice={invoice}
        onSuccess={() => {
          queryClient.invalidateQueries(['invoice', id])
          queryClient.invalidateQueries('invoices')
        }}
      />
    </Container>
  )
}

const PaymentDialog = ({ open, onClose, invoiceId, onSuccess }) => {
  const [formData, setFormData] = useState({
    payment_provider: 'offline',
    amount: '',
    payment_method_type: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const queryClient = useQueryClient()

  const mutation = useMutation(
    (data) => api.post('/payments', { ...data, invoice_id: parseInt(invoiceId) }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments')
        if (onSuccess) onSuccess()
        onClose()
        setFormData({
          payment_provider: 'offline',
          amount: '',
          payment_method_type: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      processed_at: formData.payment_date,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              required
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Payment Type</InputLabel>
              <Select
                value={formData.payment_method_type}
                label="Payment Type"
                onChange={(e) => setFormData({ ...formData, payment_method_type: e.target.value })}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="check">Check</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="wire_transfer">Wire Transfer</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Processing...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default InvoiceView

