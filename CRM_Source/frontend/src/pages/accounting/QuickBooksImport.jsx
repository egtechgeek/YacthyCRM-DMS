import { useState } from 'react'
import { useMutation } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as FileIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const QuickBooksImport = () => {
  const [selectedType, setSelectedType] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [importAs, setImportAs] = useState('both')
  const [result, setResult] = useState(null)

  const qbColors = {
    primary: '#2c5f2d',
    border: '#c8d7dc',
  }

  const importTypes = [
    {
      id: 'chart-of-accounts',
      name: 'Chart of Accounts',
      description: 'Import your account structure',
      endpoint: '/accounting/import/chart-of-accounts',
      fields: 'Account, Type, Balance Total, Description',
    },
    {
      id: 'customers',
      name: 'Customers',
      description: 'Import customer list',
      endpoint: '/accounting/import/customers',
      fields: 'Customer, Company, Main Email, Main Phone, Bill to 1-5, Ship to 1-5',
    },
    {
      id: 'vendors',
      name: 'Vendors',
      description: 'Import vendor list',
      endpoint: '/accounting/import/vendors',
      fields: 'Vendor, Company, Main Email, Main Phone, Bill to 1-5',
    },
    {
      id: 'bills',
      name: 'Bills (Vendor Bills)',
      description: 'Import vendor bills with balances and taxes',
      endpoint: '/accounting/import/bills',
      fields: 'Vendor, Num, Date, Due Date, Amount, Open Balance, Terms, Tax Amount',
    },
    {
      id: 'items',
      name: 'Item List (Products & Services)',
      description: 'Import products and services',
      endpoint: '/accounting/import/items',
      fields: 'Item, Description, Type, Cost, Price, Quantity On Hand',
      hasOptions: true,
    },
    {
      id: 'invoices',
      name: 'Invoices (Transactions)',
      description: 'Import invoice headers and balances',
      endpoint: '/accounting/import/invoices',
      fields: 'Customer, Num, Date, Due Date, Amount, Open Balance',
    },
    {
      id: 'estimates',
      name: 'Estimates (Quotes)',
      description: 'Import QuickBooks estimates / quotes',
      endpoint: '/accounting/import/estimates',
      fields: 'Customer, Num, Date, Amount, Open Balance, Active Estimate?',
    },
    {
      id: 'general-ledger',
      name: 'General Ledger',
      description: 'Import account activity and balances',
      endpoint: '/accounting/import/general-ledger',
      fields: 'Account, Type, Date, Num, Name, Memo, Split, Debit, Credit, Balance',
    },
    {
      id: 'payments',
      name: 'Payments (Customer Receipts)',
      description: 'Import customer payments to update invoice balances',
      endpoint: '/accounting/import/payments',
      fields: 'Customer, Type, Date, Num, Memo, Amount/Debit',
    },
    {
      id: 'vendor-transactions',
      name: 'Vendor Transactions (Bills & Expenses)',
      description: 'Import vendor bills, payments, and direct expenses',
      endpoint: '/accounting/import/vendor-transactions',
      fields: 'Vendor, Type, Date, Num, Memo, Account, Split, Debit, Credit',
    },
  ]

  const uploadMutation = useMutation(
    async ({ type, file, options }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (options?.import_as) {
        formData.append('import_as', options.import_as)
      }

      const endpoint = importTypes.find(t => t.id === type)?.endpoint
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    {
      onSuccess: (data) => {
        setResult({
          success: true,
          ...data
        })
        setSelectedFile(null)
      },
      onError: (error) => {
        setResult({
          success: false,
          message: error.response?.data?.message || 'Import failed',
          error: error.response?.data?.error
        })
      }
    }
  )

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleImport = () => {
    if (!selectedType || !selectedFile) return
    
    const options = selectedType === 'items' ? { import_as: importAs } : {}
    uploadMutation.mutate({ type: selectedType, file: selectedFile, options })
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            QuickBooks Import
          </Typography>
          <Typography variant="body2">
            Import data from QuickBooks Desktop CSV files
          </Typography>
        </Paper>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>How to export from QuickBooks Desktop:</strong>
          </Typography>
          <Typography variant="body2">
            1. Go to Reports → choose the list or transaction report you want to export<br />
            2. Click "Excel" → "Create New Worksheet"<br />
            3. Choose "Comma separated values (.csv)" and save the file<br />
            4. Upload the CSV file below (Invoices and Estimates export separately)
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* Import Type Selection */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Step 1: Select Import Type
              </Typography>
              
              <Grid container spacing={2}>
                {importTypes.map((type) => (
                  <Grid item xs={12} key={type.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedType === type.id ? `2px solid ${qbColors.primary}` : '1px solid #e0e0e0',
                        '&:hover': { boxShadow: 3 }
                      }}
                      onClick={() => {
                        setSelectedType(type.id)
                        setResult(null)
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {type.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {type.description}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          <strong>CSV Columns:</strong> {type.fields}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* File Upload and Options */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Step 2: Upload CSV File
              </Typography>

              {!selectedType && (
                <Alert severity="warning">
                  Please select an import type first
                </Alert>
              )}

              {selectedType && (
                <>
                  {selectedType === 'items' && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Import As</InputLabel>
                      <Select
                        value={importAs}
                        onChange={(e) => setImportAs(e.target.value)}
                        label="Import As"
                      >
                        <MenuItem value="both">Both Parts and Services</MenuItem>
                        <MenuItem value="parts">Parts Only</MenuItem>
                        <MenuItem value="services">Services Only</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  <Box sx={{ textAlign: 'center', py: 4, border: '2px dashed #ccc', borderRadius: 1, mb: 2 }}>
                    <input
                      accept=".csv,.txt"
                      style={{ display: 'none' }}
                      id="file-upload"
                      type="file"
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<FileIcon />}
                      >
                        Choose CSV File
                      </Button>
                    </label>
                    
                    {selectedFile && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Selected:</strong> {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<UploadIcon />}
                    onClick={handleImport}
                    disabled={!selectedFile || uploadMutation.isLoading}
                    sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                  >
                    {uploadMutation.isLoading ? 'Importing...' : 'Import Data'}
                  </Button>

                  {uploadMutation.isLoading && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress />
                      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                        Processing your file...
                      </Typography>
                    </Box>
                  )}

                  {result && (
                    <Alert 
                      severity={result.success ? 'success' : 'error'}
                      icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                      sx={{ mt: 2 }}
                    >
                      <Typography variant="body2" gutterBottom>
                        <strong>{result.message}</strong>
                      </Typography>
                      {(result.created !== undefined || result.updated !== undefined) && (
                        <Typography variant="body2">
                          Created: {result.created ?? 0} | Updated: {result.updated ?? 0}
                        </Typography>
                      )}
                      {result.skipped > 0 && (
                        <Typography variant="body2">
                          Skipped: {result.skipped} records
                        </Typography>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" display="block">Errors:</Typography>
                          <List dense>
                            {result.errors.slice(0, 5).map((error, index) => (
                              <ListItem key={index} sx={{ py: 0 }}>
                                <ListItemText 
                                  primary={error}
                                  primaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Alert>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* CSV Format Guide */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            CSV Format Guide
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Chart of Accounts Example:
              </Typography>
              <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontSize: '0.75rem', overflow: 'auto' }}>
{`1000,Checking Account,Bank,5000.00
1200,Accounts Receivable,Accounts Receivable,0
4000,Sales Income,Income,0`}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Items Example:
              </Typography>
              <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontSize: '0.75rem', overflow: 'auto' }}>
{`Widget A,Standard widget,29.99,15.00,Inventory,100
Consulting,Professional services,150.00,0,Service,0
Widget B,Premium widget,49.99,25.00,Inventory,50`}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  )
}

export default QuickBooksImport
