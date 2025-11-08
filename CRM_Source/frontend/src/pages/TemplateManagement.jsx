import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  TextField,
  Grid,
  Divider,
} from '@mui/material'
import {
  Description as TemplateIcon,
  Save as SaveIcon,
  Refresh as ResetIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const TemplateManagement = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)
  const [invoiceTemplate, setInvoiceTemplate] = useState('')
  const [quoteTemplate, setQuoteTemplate] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <Container>
        <Alert severity="error">
          Access Denied: This page is only available to Admin users.
        </Alert>
      </Container>
    )
  }

  const { data: templates, isLoading } = useQuery('pdf-templates', async () => {
    const response = await api.get('/templates')
    return response.data
  }, {
    onSuccess: (data) => {
      setInvoiceTemplate(data.invoice || '')
      setQuoteTemplate(data.quote || '')
    }
  })

  const saveTemplateMutation = useMutation(
    (templateData) => api.post('/templates', templateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pdf-templates')
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to save template')
      },
    }
  )

  const resetTemplateMutation = useMutation(
    (type) => api.post(`/templates/${type}/reset`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pdf-templates')
        alert('Template reset to default')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to reset template')
      },
    }
  )

  const handleSave = () => {
    const templateType = activeTab === 0 ? 'invoice' : 'quote'
    const templateContent = activeTab === 0 ? invoiceTemplate : quoteTemplate

    saveTemplateMutation.mutate({
      type: templateType,
      content: templateContent,
    })
  }

  const handleReset = () => {
    const templateType = activeTab === 0 ? 'invoice' : 'quote'
    
    if (window.confirm(`Are you sure you want to reset the ${templateType} template to default? This cannot be undone.`)) {
      resetTemplateMutation.mutate(templateType)
    }
  }

  const handlePreview = () => {
    alert('Preview functionality coming soon! Generate a test PDF from an actual invoice/quote to see the template in action.')
  }

  if (isLoading) {
    return (
      <Container>
        <Typography>Loading templates...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          <TemplateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          PDF Template Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customize the HTML templates used for generating Invoice and Quote PDFs. Admin access only.
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Template saved successfully!
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Invoice Template" />
          <Tab label="Quote Template" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Editor */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {activeTab === 0 ? 'Invoice Template' : 'Quote Template'} Editor
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  size="small"
                >
                  Preview
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  size="small"
                >
                  Reset to Default
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saveTemplateMutation.isLoading}
                  size="small"
                >
                  {saveTemplateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              multiline
              rows={30}
              value={activeTab === 0 ? invoiceTemplate : quoteTemplate}
              onChange={(e) => {
                if (activeTab === 0) {
                  setInvoiceTemplate(e.target.value)
                } else {
                  setQuoteTemplate(e.target.value)
                }
              }}
              placeholder="Enter your HTML template here..."
              variant="outlined"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                '& textarea': {
                  fontFamily: 'monospace',
                },
              }}
            />
          </Paper>
        </Grid>

        {/* Help Panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Template Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Use these Blade/Laravel template variables in your HTML:
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {activeTab === 0 ? 'Invoice' : 'Quote'} Variables:
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '200px',
              }}>
                {activeTab === 0 ? `{{ $invoice->invoice_number }}
{{ $invoice->issue_date }}
{{ $invoice->due_date }}
{{ $invoice->status }}
{{ $invoice->subtotal }}
{{ $invoice->tax_rate }}
{{ $invoice->tax_amount }}
{{ $invoice->total }}
{{ $invoice->paid_amount }}
{{ $invoice->balance }}
{{ $invoice->notes }}` : `{{ $quote->quote_number }}
{{ $quote->created_at }}
{{ $quote->expiration_date }}
{{ $quote->status }}
{{ $quote->subtotal }}
{{ $quote->tax_rate }}
{{ $quote->tax_amount }}
{{ $quote->total }}
{{ $quote->notes }}`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Customer Variables:
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '150px',
              }}>
{`{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->name }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->email }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->phone }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->address }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->city }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->state }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->zip }}
{{ $${activeTab === 0 ? 'invoice' : 'quote'}->customer->country }}`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Yacht Variables (if applicable):
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '100px',
              }}>
{`@if($${activeTab === 0 ? 'invoice' : 'quote'}->yacht)
  {{ $${activeTab === 0 ? 'invoice' : 'quote'}->yacht->name }}
  {{ $${activeTab === 0 ? 'invoice' : 'quote'}->yacht->type }}
@endif`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Line Items Loop:
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '150px',
              }}>
{`@foreach($${activeTab === 0 ? 'invoice' : 'quote'}->items as $item)
  {{ $item->description }}
  {{ $item->quantity }}
  {{ $item->unit_price }}
  {{ $item->discount }}
  {{ $item->total }}
@endforeach`}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Formatting Functions:
              </Typography>
              <Box component="pre" sx={{ 
                fontSize: '0.75rem', 
                backgroundColor: '#f5f5f5', 
                p: 1, 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '100px',
              }}>
{`{{ number_format($amount, 2) }}
{{ \\Carbon\\Carbon::parse($date)->format('M d, Y') }}
{{ ucfirst($status) }}`}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Tips:
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              • Use standard HTML and inline CSS
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              • External CSS files are not supported
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              • JavaScript is not supported in PDFs
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              • Test frequently by generating a real PDF
            </Typography>
            <Typography variant="caption" display="block" gutterBottom>
              • Keep layout simple for best results
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                <strong>Note:</strong> Changes to templates will affect all future PDF generations. Existing PDFs will not be affected.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}

export default TemplateManagement

