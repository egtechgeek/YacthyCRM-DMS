import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
} from '@mui/material'
import { ArrowBack as BackIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'
import useBranding from '../hooks/useBranding'
import BusinessIdentity from '../components/BusinessIdentity'

const QuoteView = () => {
  const assetLabels = useAssetLabels()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: quoteResponse, isLoading, error } = useQuery(['quote', id], async () => {
    const response = await api.get(`/quotes/${id}`)
    return response.data
  })

  const quote = quoteResponse?.quote || quoteResponse
  const brandingFromQuote = quoteResponse?.branding
  const { data: fallbackBranding } = useBranding({ enabled: !brandingFromQuote })
  const branding = brandingFromQuote || fallbackBranding

  const convertMutation = useMutation(
    () => api.post(`/quotes/${id}/convert-to-invoice`),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('quotes')
        queryClient.invalidateQueries('invoices')
        navigate(`/invoices/${response.data.id}`)
      },
    }
  )

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      accepted: 'success',
      rejected: 'error',
      expired: 'warning',
    }
    return colors[status] || 'default'
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/quotes/${id}/download-pdf`, {
        responseType: 'blob',
      })
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `quote_${quote?.quote_number || id}.pdf`)
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

  if (error || !quote) {
    return (
      <Container>
        <Alert severity="error">Quote not found</Alert>
        <Button onClick={() => navigate('/quotes')} sx={{ mt: 2 }}>
          Back to Quotes
        </Button>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/quotes')}>
          Back
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={handleDownloadPDF}>
            Download PDF
          </Button>
          {quote.status === 'accepted' && (
            <Button
              variant="contained"
              onClick={() => {
                if (window.confirm('Convert this quote to an invoice?')) {
                  convertMutation.mutate()
                }
              }}
              disabled={convertMutation.isLoading}
            >
              {convertMutation.isLoading ? 'Converting...' : 'Convert to Invoice'}
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        {branding && (
          <BusinessIdentity branding={branding} title="Issued By" sx={{ mb: 3 }} />
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4">Quote #{quote.quote_number}</Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(quote.created_at).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip label={quote.status} color={getStatusColor(quote.status)} />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Customer Information</Typography>
          <Typography><strong>Name:</strong> {quote.customer?.name}</Typography>
          <Typography><strong>Email:</strong> {quote.customer?.email || '-'}</Typography>
          <Typography><strong>Phone:</strong> {quote.customer?.phone || '-'}</Typography>
          {(quote.customer?.billing_address || quote.customer?.billing_city || quote.customer?.billing_state || quote.customer?.billing_zip) && (
            <Box sx={{ mt: 1 }}>
              {quote.customer?.billing_address && (
                <Typography variant="body2">{quote.customer.billing_address}</Typography>
              )}
              {(quote.customer?.billing_city || quote.customer?.billing_state || quote.customer?.billing_zip) && (
                <Typography variant="body2">
                  {[quote.customer?.billing_city, quote.customer?.billing_state].filter(Boolean).join(', ')}
                  {quote.customer?.billing_zip ? ` ${quote.customer.billing_zip}` : ''}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {(quote.vehicle || quote.yacht) && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>{assetLabels.singular} Information</Typography>
            {quote.vehicle ? (
              <>
                <Typography><strong>Make/Model:</strong> {[quote.vehicle.year, quote.vehicle.make, quote.vehicle.model].filter(Boolean).join(' ') || '-'}</Typography>
                <Typography><strong>VIN:</strong> {quote.vehicle.vin || '-'}</Typography>
                {quote.vehicle.coach_number && (
                  <Typography><strong>Coach #:</strong> {quote.vehicle.coach_number}</Typography>
                )}
              </>
            ) : (
              <>
                <Typography><strong>Name:</strong> {quote.yacht?.name}</Typography>
                <Typography><strong>Type:</strong> {quote.yacht?.type || '-'}</Typography>
                <Typography><strong>HIN:</strong> {quote.yacht?.hull_identification_number || '-'}</Typography>
              </>
            )}
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
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
                {quote.items?.map((item, index) => (
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Box sx={{ minWidth: 300 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Subtotal:</Typography>
              <Typography>${quote.subtotal?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Tax ({quote.tax_rate}%):</Typography>
              <Typography>${quote.tax_amount?.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', pt: 1 }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">${quote.total?.toFixed(2)}</Typography>
            </Box>
          </Box>
        </Box>

        {quote.expiration_date && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Expiration Date:</strong> {new Date(quote.expiration_date).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {quote.notes && (
          <Box>
            <Typography variant="h6" gutterBottom>Notes</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {quote.notes}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default QuoteView

