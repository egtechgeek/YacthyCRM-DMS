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
  const [sqlFile, setSqlFile] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [jsonFile, setJsonFile] = useState(null)
  const [importType, setImportType] = useState('customers')
  const [jsonImportType, setJsonImportType] = useState('complete')
  const [sqlResult, setSqlResult] = useState(null)
  const [csvResult, setCsvResult] = useState(null)
  const [jsonResult, setJsonResult] = useState(null)
  const [sqlError, setSqlError] = useState(null)
  const [csvError, setCsvError] = useState(null)
  const [jsonError, setJsonError] = useState(null)

  // InvoicePlane SQL import
  const invoicePlaneMutation = useMutation(
    async (formData) => {
      return await api.post('/import/invoiceplane', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: (response) => {
        setSqlResult(response.data)
        setSqlError(null)
      },
      onError: (err) => {
        setSqlError(err.response?.data?.message || 'Import failed')
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
        setCsvResult(response.data)
        setCsvError(null)
        alert(`Import completed: ${response.data.imported} records imported`)
      },
      onError: (err) => {
        setCsvError(err.response?.data?.message || 'Import failed')
      },
    }
  )

  const jsonMutation = useMutation(
    async (formData) => {
      return await api.post('/import/json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    {
      onSuccess: (response) => {
        setJsonResult(response.data)
        setJsonError(null)
        alert('JSON import completed successfully')
      },
      onError: (err) => {
        setJsonError(err.response?.data?.message || 'Import failed')
      },
    }
  )

  const handleSqlFileSelect = (e) => {
    setSqlFile(e.target.files[0] || null)
    setSqlError(null)
    setSqlResult(null)
  }

  const handleCsvFileSelect = (e) => {
    setCsvFile(e.target.files[0] || null)
    setCsvError(null)
    setCsvResult(null)
  }

  const handleJsonFileSelect = (e) => {
    setJsonFile(e.target.files[0] || null)
    setJsonError(null)
    setJsonResult(null)
  }

  const handleInvoicePlaneImport = () => {
    if (!sqlFile) return

    const formData = new FormData()
    formData.append('sql_file', sqlFile)
    invoicePlaneMutation.mutate(formData)
  }

  const handleCSVImport = () => {
    if (!csvFile) return

    const formData = new FormData()
    formData.append('csv_file', csvFile)
    formData.append('import_type', importType)
    csvMutation.mutate(formData)
  }

  const handleJSONImport = () => {
    if (!jsonFile) return

    const formData = new FormData()
    formData.append('json_file', jsonFile)
    formData.append('import_type', jsonImportType)
    jsonMutation.mutate(formData)
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
            <Tab label="JSON Import" />
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
                  onChange={handleSqlFileSelect}
                />
              </Button>

              {sqlFile && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">Selected: {sqlFile.name}</Typography>
                </Box>
              )}

              {sqlError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {sqlError}
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleInvoicePlaneImport}
                disabled={!sqlFile || invoicePlaneMutation.isLoading}
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
                  onChange={handleCsvFileSelect}
                />
              </Button>

              {csvFile && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">Selected: {csvFile.name}</Typography>
                </Box>
              )}

              {csvError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {csvError}
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleCSVImport}
                disabled={!csvFile || csvMutation.isLoading}
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

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                JSON Import
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Import data from JSON backups. Use the "Complete" option for full system restores exported from the Export Data screen.
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Import Scope</InputLabel>
                <Select
                  value={jsonImportType}
                  label="Import Scope"
                  onChange={(e) => setJsonImportType(e.target.value)}
                >
                  <MenuItem value="complete">Complete Backup</MenuItem>
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
                Select JSON File
                <input
                  type="file"
                  hidden
                  accept=".json,application/json"
                  onChange={handleJsonFileSelect}
                />
              </Button>

              {jsonFile && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">Selected: {jsonFile.name}</Typography>
                </Box>
              )}

              {jsonError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {jsonError}
                </Alert>
              )}

              {jsonImportType === 'complete' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Complete restore will upsert data across all major tables. Ensure the backup file is trusted and current.
                </Alert>
              )}

              <Button
                variant="contained"
                onClick={handleJSONImport}
                disabled={!jsonFile || jsonMutation.isLoading}
                fullWidth
              >
                {jsonMutation.isLoading ? <CircularProgress size={24} /> : `Import ${jsonImportType === 'complete' ? 'Complete Backup' : jsonImportType.charAt(0).toUpperCase() + jsonImportType.slice(1)}`}
              </Button>
            </Box>
          )}

          {sqlResult && tabValue === 0 && (
            <Alert severity="success" sx={{ mt: 3 }}>
              InvoicePlane import completed successfully!
            </Alert>
          )}

          {csvResult && tabValue === 1 && (
            <Alert severity="success" sx={{ mt: 3 }}>
              CSV import completed successfully! {csvResult.imported || 0} records imported.
            </Alert>
          )}

          {jsonResult && tabValue === 2 && (
            <Alert severity="success" sx={{ mt: 3 }}>
              JSON import completed successfully.
              {jsonResult.counts && (
                <Box component="span" sx={{ display: 'block', mt: 1 }}>
                  {Object.entries(jsonResult.counts).map(([table, count]) => (
                    <Typography key={table} variant="caption" sx={{ display: 'block' }}>
                      {table}: {count} records processed
                    </Typography>
                  ))}
                </Box>
              )}
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default Import
