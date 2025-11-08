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
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  Pagination,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as TransactionIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const BankTransactions = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [bankAccountFilter, setBankAccountFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    bank_account_id: null,
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'deposit',
    check_number: '',
    payee: '',
    description: '',
    debit: 0,
    credit: 0,
    account_id: null,
    memo: '',
  })

  const qbColors = {
    primary: '#2c5f2d',
    border: '#c8d7dc',
  }

  const { data: transactionsData, isLoading } = useQuery(
    ['bankTransactions', page, typeFilter, bankAccountFilter],
    () => api.get('/accounting/bank-transactions', {
      params: { page, type: typeFilter, bank_account_id: bankAccountFilter, per_page: 15 }
    }).then(res => res.data),
    { keepPreviousData: true }
  )

  const { data: bankAccounts } = useQuery(
    'bankAccounts',
    () => api.get('/accounting/bank-accounts').then(res => res.data)
  )

  const { data: chartAccounts } = useQuery(
    'chartOfAccounts',
    () => api.get('/accounting/chart-of-accounts', { params: { per_page: 1000 } }).then(res => res.data.data)
  )

  const createMutation = useMutation(
    (data) => api.post('/accounting/bank-transactions', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bankTransactions')
        queryClient.invalidateQueries('bankAccounts')
        setDialogOpen(false)
        resetForm()
      },
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/accounting/bank-transactions/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bankTransactions')
        queryClient.invalidateQueries('bankAccounts')
      },
    }
  )

  const resetForm = () => {
    setFormData({
      bank_account_id: null,
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'deposit',
      check_number: '',
      payee: '',
      description: '',
      debit: 0,
      credit: 0,
      account_id: null,
      memo: '',
    })
  }

  const handleSubmit = () => {
    createMutation.mutate(formData)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <TransactionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bank Transactions
          </Typography>
          <Typography variant="body2">
            Deposits, Checks, and other bank transactions
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              size="small"
              label="Bank Account"
              value={bankAccountFilter}
              onChange={(e) => {
                setBankAccountFilter(e.target.value)
                setPage(1)
              }}
              sx={{ width: 200 }}
            >
              <MenuItem value="">All Accounts</MenuItem>
              {bankAccounts?.map((account) => (
                <MenuItem key={account.id} value={account.id}>{account.account_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              sx={{ width: 150 }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="deposit">Deposit</MenuItem>
              <MenuItem value="withdrawal">Withdrawal</MenuItem>
              <MenuItem value="check">Check</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
              <MenuItem value="fee">Fee</MenuItem>
              <MenuItem value="interest">Interest</MenuItem>
            </TextField>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
          >
            New Transaction
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.border }}>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Bank Account</TableCell>
                <TableCell>Payee</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Debit</TableCell>
                <TableCell align="right">Credit</TableCell>
                <TableCell>Reconciled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">Loading...</TableCell>
                </TableRow>
              ) : transactionsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No transactions found</TableCell>
                </TableRow>
              ) : (
                transactionsData?.data?.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.bank_account?.account_name || '-'}</TableCell>
                    <TableCell>{transaction.payee || '-'}</TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell align="right">
                      {transaction.debit > 0 ? `$${parseFloat(transaction.debit).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {transaction.credit > 0 ? `$${parseFloat(transaction.credit).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.is_reconciled ? 'Yes' : 'No'}
                        size="small"
                        color={transaction.is_reconciled ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!transaction.is_reconciled && (
                        <IconButton size="small" onClick={() => handleDelete(transaction.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {transactionsData?.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={transactionsData.last_page}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={bankAccounts || []}
                getOptionLabel={(option) => option.account_name || ''}
                value={bankAccounts?.find(a => a.id === formData.bank_account_id) || null}
                onChange={(e, value) => setFormData({ ...formData, bank_account_id: value?.id || null })}
                renderInput={(params) => <TextField {...params} label="Bank Account *" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Transaction Date *"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Type *"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="deposit">Deposit</MenuItem>
                <MenuItem value="withdrawal">Withdrawal</MenuItem>
                <MenuItem value="check">Check</MenuItem>
                <MenuItem value="transfer">Transfer</MenuItem>
                <MenuItem value="fee">Fee</MenuItem>
                <MenuItem value="interest">Interest</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Check Number"
                value={formData.check_number}
                onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Payee"
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Debit (Payment/Expense)"
                value={formData.debit}
                onChange={(e) => setFormData({ ...formData, debit: parseFloat(e.target.value) || 0, credit: 0 })}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Credit (Deposit/Income)"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0, debit: 0 })}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={chartAccounts || []}
                getOptionLabel={(option) => `${option.account_number} - ${option.account_name}` || ''}
                value={chartAccounts?.find(a => a.id === formData.account_id) || null}
                onChange={(e, value) => setFormData({ ...formData, account_id: value?.id || null })}
                renderInput={(params) => <TextField {...params} label="Account Category" />}
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
            disabled={!formData.bank_account_id || (formData.debit === 0 && formData.credit === 0)}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default BankTransactions

