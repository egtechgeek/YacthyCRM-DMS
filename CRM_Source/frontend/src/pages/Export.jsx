import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  CircularProgress,
} from '@mui/material'
import { Download as DownloadIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'

const Export = () => {
  const { user } = useAuth()
  const assetLabels = useAssetLabels()
  const navigate = useNavigate()
  const [dataType, setDataType] = useState('customers')
  const [format, setFormat] = useState('csv')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!assetLabels.yachtEnabled && dataType === 'yachts') {
      setDataType(assetLabels.dmsEnabled ? 'vehicles' : 'customers')
    } else if (!assetLabels.dmsEnabled && dataType === 'vehicles') {
      setDataType(assetLabels.yachtEnabled ? 'yachts' : 'customers')
    }
  }, [assetLabels.yachtEnabled, assetLabels.dmsEnabled, dataType])

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = {
        type: dataType,
        format: format,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      }

      const response = await api.get('/export', {
        params,
        responseType: 'blob',
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const fileExt = format === 'json' ? 'json' : 'csv'
      link.setAttribute('download', `${dataType}_export_${new Date().toISOString().split('T')[0]}.${fileExt}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      alert('Export completed successfully')
    } catch (error) {
      alert('Export failed: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Export Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Export your data in various formats (Admin only)
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={dataType}
                  label="Data Type"
                  onChange={(e) => setDataType(e.target.value)}
                >
                  <MenuItem value="customers">Customers</MenuItem>
                  {assetLabels.yachtEnabled && <MenuItem value="yachts">Yachts</MenuItem>}
                  {assetLabels.dmsEnabled && <MenuItem value="vehicles">Vehicles</MenuItem>}
                  <MenuItem value="invoices">Invoices</MenuItem>
                  <MenuItem value="quotes">Quotes</MenuItem>
                  <MenuItem value="payments">Payments</MenuItem>
                  <MenuItem value="parts">Parts Inventory</MenuItem>
                  <MenuItem value="services">Services</MenuItem>
                  <MenuItem value="appointments">Appointments</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={format}
                  label="Export Format"
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <MenuItem value="csv">CSV (Excel Compatible)</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Date From (Optional)"
                type="date"
                fullWidth
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Filter by creation date"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Date To (Optional)"
                type="date"
                fullWidth
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Filter by creation date"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Exporting...' : `Export ${dataType.charAt(0).toUpperCase() + dataType.slice(1)} as ${format.toUpperCase()}`}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Export Information
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>CSV Format:</strong> Compatible with Excel, Google Sheets, and most spreadsheet applications
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>JSON Format:</strong> Complete data structure, useful for backups and integrations
          </Typography>
          <Typography variant="body2" paragraph>
            • <strong>Date Filters:</strong> Optional - leave empty to export all records
          </Typography>
          <Typography variant="body2">
            • <strong>Privacy:</strong> Exports may contain sensitive information. Handle with care.
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}

export default Export

