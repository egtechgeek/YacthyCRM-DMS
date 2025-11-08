import { useState } from 'react'
import { useMutation } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material'
import { CloudUpload as UploadIcon } from '@mui/icons-material'
import api from '../services/api'

const Import = () => {
  const [tabValue, setTabValue] = useState(0)
  const [file, setFile] = useState(null)
  const [importType, setImportType] = useState('customers')
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  // InvoicePlane SQL import
  const invoicePlaneMutation = useMutation(
    async (formData) => {
      return await api.post('/import/invoiceplane', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: (response) => {
        setImportResult(response.data)
        setError(null)
      },
      onError: (err) => {
        setError(err.response?.data?.message || 'Import failed')
      },
    }
  )

  // CSV import
  const csvMutation = useMutation(
    async (formData) => {
      return await api.post('/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: (response) => {
        setImportResult(response.data)
        setError(null)
        alert(`Import completed: ${response.data.imported} records imported`)
      },
      onError: (err) => {
        setError(err.response?.data?.message || 'Import failed')
      },
    }
  )

  const handleFileSelect = (e) => {
    setFile(e.target.files[0])
    setError(null)
    setImportResult(null)
  }

  const handleInvoicePlaneImport = () => {
    if (!file) return

    const formData = new FormData()
    formData.append('sql_file', file)
    invoicePlaneMutation.mutate(formData)
  }

  const handleCSVImport = () => {
    if (!file) return

    const formData = new FormData()
    formData.append('csv_file', file)
    formData.append('import_type', importType)
    csvMutation.mutate(formData)
  }

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Import Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Import data from various sources
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label="InvoicePlane SQL" />
            <Tab label="CSV Import" />
          </Tabs>

          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                InvoicePlane SQL Import
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Import customers, invoices, quotes, and payments from an InvoicePlane SQL dump file.
              </Typography>

              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                Select SQL File
                <input
                  type="file"
                  hidden
                  accept=".sql"
                  onChange={handleFileSelect}
                />
              </Button>

              {file && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">Selected: {file.name}</Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleInvoicePlaneImport}
                disabled={!file || invoicePlaneMutation.isLoading}
                fullWidth
              >
                {invoicePlaneMutation.isLoading ? <CircularProgress size={24} /> : 'Import InvoicePlane Data'}
              </Button>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                CSV Import
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Import data from CSV files. First row should contain column headers.
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Import Type</InputLabel>
                <Select
                  value={importType}
                  label="Import Type"
                  onChange={(e) => setImportType(e.target.value)}
                >
                  <MenuItem value="customers">Customers</MenuItem>
                  <MenuItem value="parts">Parts Inventory</MenuItem>
                  <MenuItem value="services">Services</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                Select CSV File
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleFileSelect}
                />
              </Button>

              {file && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">Selected: {file.name}</Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleCSVImport}
                disabled={!file || csvMutation.isLoading}
                fullWidth
              >
                {csvMutation.isLoading ? <CircularProgress size={24} /> : `Import ${importType.charAt(0).toUpperCase() + importType.slice(1)}`}
              </Button>

              <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  CSV Format Requirements:
                </Typography>
                {importType === 'customers' && (
                  <Typography variant="caption" component="div">
                    Required columns: name, email<br />
                    Optional columns: phone, address, city, state, zip, country, notes
                  </Typography>
                )}
                {importType === 'parts' && (
                  <Typography variant="caption" component="div">
                    Required columns: sku, name, unit_price<br />
                    Optional columns: description, category, cost, stock_quantity, location
                  </Typography>
                )}
                {importType === 'services' && (
                  <Typography variant="caption" component="div">
                    Required columns: name, hourly_rate<br />
                    Optional columns: description, category, billable
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {importResult && (
            <Alert severity="success" sx={{ mt: 3 }}>
              Import completed successfully! {importResult.imported || 0} records imported.
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default Import
