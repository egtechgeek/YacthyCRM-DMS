import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Autocomplete,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const BankAccountsList = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    routing_number: '',
    chart_account_id: null,
    opening_balance: 0,
    opening_balance_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: '',
  })

  const qbColors = {
    primary: '#2c5f2d',
    border: '#c8d7dc',
  }

  const { data: accounts, isLoading } = useQuery(
    'bankAccounts',
    () => api.get('/accounting/bank-accounts').then(res => res.data)
  )

  const { data: chartAccounts } = useQuery(
    'chartOfAccounts-bank',
    () => api.get('/accounting/chart-of-accounts', {
      params: { per_page: 1000, type: 'asset' }
    }).then(res => res.data.data)
  )

  const createMutation = useMutation(
    (data) => api.post('/accounting/bank-accounts', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bankAccounts')
        setDialogOpen(false)
        resetForm()
      },
    }
  )

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/accounting/bank-accounts/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bankAccounts')
        setDialogOpen(false)
        resetForm()
      },
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/accounting/bank-accounts/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bankAccounts')
      },
    }
  )

  const resetForm = () => {
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      routing_number: '',
      chart_account_id: null,
      opening_balance: 0,
      opening_balance_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: '',
    })
    setEditingAccount(null)
  }

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingAccount(account)
      setFormData(account)
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <BankIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bank Accounts
          </Typography>
          <Typography variant="body2">
            Manage your bank accounts and balances
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
          >
            Add Bank Account
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.border }}>
                <TableCell>Account Name</TableCell>
                <TableCell>Bank Name</TableCell>
                <TableCell>Account Number</TableCell>
                <TableCell align="right">Current Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Loading...</TableCell>
                </TableRow>
              ) : accounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No bank accounts found</TableCell>
                </TableRow>
              ) : (
                accounts?.map((account) => (
                  <TableRow key={account.id} hover>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell>{account.bank_name || '-'}</TableCell>
                    <TableCell>{account.account_number || '-'}</TableCell>
                    <TableCell align="right">${parseFloat(account.current_balance || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={account.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={account.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(account)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(account.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAccount ? 'Edit Bank Account' : 'New Bank Account'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Name *"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bank Name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Account Number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Routing Number"
                value={formData.routing_number}
                onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={chartAccounts || []}
                getOptionLabel={(option) => `${option.account_number} - ${option.account_name}` || ''}
                value={chartAccounts?.find(a => a.id === formData.chart_account_id) || null}
                onChange={(e, value) => setFormData({ ...formData, chart_account_id: value?.id || null })}
                renderInput={(params) => <TextField {...params} label="Chart of Accounts Link" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Opening Balance"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                inputProps={{ step: 0.01 }}
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
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
            disabled={!formData.account_name}
          >
            {editingAccount ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default BankAccountsList

