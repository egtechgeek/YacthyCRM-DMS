import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Autocomplete,
  Pagination,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as ChartIcon,
  Refresh as RefreshIcon,
  SubdirectoryArrowRight as SubIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const ChartOfAccounts = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')

  // QuickBooks colors
  const qbColors = {
    primary: '#2c5f2d',
    headerBg: '#e8f4f8',
    border: '#c8d7dc',
  }

  const { data, isLoading, error } = useQuery(
    ['chart-of-accounts', page, typeFilter],
    async () => {
      const params = {
        page,
        per_page: 50,
        ...(typeFilter !== 'all' && { type: typeFilter }),
      }
      const response = await api.get('/accounting/chart-of-accounts', { params })
      return response.data
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/accounting/chart-of-accounts/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('chart-of-accounts')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to delete account')
      },
    }
  )

  const recalculateMutation = useMutation(
    () => api.post('/accounting/chart-of-accounts/recalculate'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('chart-of-accounts')
        alert('All account balances recalculated')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      deleteMutation.mutate(id)
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'asset': return '#1976d2'
      case 'liability': return '#d32f2f'
      case 'equity': return '#7b1fa2'
      case 'revenue': return '#2e7d32'
      case 'expense': return '#ed6c02'
      default: return '#666'
    }
  }

  const formatBalance = (balance) => {
    const num = parseFloat(balance || 0)
    return num < 0 ? `(${Math.abs(num).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})` : num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading chart of accounts</Alert></Container>

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* QuickBooks-style Header */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Chart of Accounts
              </Typography>
              <Typography variant="body2">
                List of all accounts used in your company
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                sx={{ bgcolor: '#fff', color: qbColors.primary, '&:hover': { bgcolor: '#f0f0f0' } }}
                startIcon={<RefreshIcon />}
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isLoading}
              >
                Recalculate Balances
              </Button>
              <Button
                variant="contained"
                sx={{ bgcolor: '#fff', color: qbColors.primary, '&:hover': { bgcolor: '#f0f0f0' } }}
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingAccount(null)
                  setDialogOpen(true)
                }}
              >
                New Account
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Account List - QuickBooks Style */}
        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: qbColors.border }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.headerBg }}>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Account #</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Account Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%', textAlign: 'right' }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.accounts?.map((account) => (
                <TableRow 
                  key={account.id}
                  sx={{ 
                    '&:hover': { bgcolor: '#f5f5f5' },
                    bgcolor: account.is_sub_account ? '#fafafa' : 'inherit',
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {account.account_number}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {account.is_sub_account && <SubIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />}
                      <Typography variant="body2" sx={{ fontWeight: account.is_sub_account ? 'normal' : 500 }}>
                        {account.account_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.account_type} 
                      size="small" 
                      sx={{ 
                        bgcolor: 'transparent',
                        border: '1px solid',
                        borderColor: getTypeColor(account.account_type),
                        color: getTypeColor(account.account_type),
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: account.current_balance < 0 ? '#d32f2f' : 'inherit',
                        fontWeight: 500,
                      }}
                    >
                      ${formatBalance(account.current_balance)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingAccount(account)
                        setDialogOpen(true)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(account.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.total > data.per_page && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Page {data.current_page} of {data.last_page} ({data.total} total accounts)
            </Typography>
            <Pagination
              count={data.last_page}
              page={data.current_page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* Account Dialog */}
        <AccountDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false)
            setEditingAccount(null)
          }}
          account={editingAccount}
          accounts={data?.accounts || []}
        />

        {/* Navigation Buttons */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/accounting')}
          >
            Back to Accounting Home
          </Button>
        </Box>
      </Box>
    </Container>
  )
}

// Account Dialog Component
const AccountDialog = ({ open, onClose, account, accounts }) => {
  const queryClient = useQueryClient()
  const isEdit = Boolean(account)

  const [formData, setFormData] = useState({
    account_number: '',
    account_name: '',
    account_type: 'asset',
    detail_type: '',
    parent_id: '',
    description: '',
    opening_balance: '',
    opening_balance_date: '',
  })

  const saveMutation = useMutation(
    (data) => {
      if (isEdit) {
        return api.put(`/accounting/chart-of-accounts/${account.id}`, data)
      }
      return api.post('/accounting/chart-of-accounts', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('chart-of-accounts')
        onClose()
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to save account')
      },
    }
  )

  // Update form when account changes
  useState(() => {
    if (account) {
      setFormData({
        account_number: account.account_number || '',
        account_name: account.account_name || '',
        account_type: account.account_type || 'asset',
        detail_type: account.detail_type || '',
        parent_id: account.parent_id || '',
        description: account.description || '',
        opening_balance: account.opening_balance || '',
        opening_balance_date: account.opening_balance_date || '',
      })
    } else {
      setFormData({
        account_number: '',
        account_name: '',
        account_type: 'asset',
        detail_type: '',
        parent_id: '',
        description: '',
        opening_balance: '',
        opening_balance_date: '',
      })
    }
  }, [account])

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const parentAccounts = accounts.filter(a => !a.is_sub_account && a.id !== account?.id)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEdit ? 'Edit Account' : 'New Account'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Account Number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="e.g., 1000"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                required
                label="Account Name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., Cash in Bank"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={formData.account_type}
                  label="Account Type"
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                >
                  <MenuItem value="asset">Asset</MenuItem>
                  <MenuItem value="liability">Liability</MenuItem>
                  <MenuItem value="equity">Equity</MenuItem>
                  <MenuItem value="revenue">Income/Revenue</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                  <MenuItem value="cost_of_goods_sold">Cost of Goods Sold</MenuItem>
                  <MenuItem value="other_income">Other Income</MenuItem>
                  <MenuItem value="other_expense">Other Expense</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={parentAccounts}
                getOptionLabel={(option) => `${option.account_number} - ${option.account_name}`}
                value={parentAccounts.find(a => a.id === formData.parent_id) || null}
                onChange={(e, newValue) => setFormData({ ...formData, parent_id: newValue?.id || '' })}
                renderInput={(params) => (
                  <TextField {...params} label="Parent Account (Optional)" />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Opening Balance"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                inputProps={{ step: '0.01' }}
                InputProps={{ startAdornment: '$' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Opening Balance Date"
                value={formData.opening_balance_date}
                onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saveMutation.isLoading}>
            {saveMutation.isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ChartOfAccounts

