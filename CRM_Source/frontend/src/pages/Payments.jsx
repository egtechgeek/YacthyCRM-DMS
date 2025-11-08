import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  IconButton,
  Pagination,
} from '@mui/material'
import { Add, CreditCard, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import api from '../services/api'
import VirtualTerminal from '../components/VirtualTerminal'
import { useAuth } from '../contexts/AuthContext'

const Payments = () => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [virtualTerminalOpen, setVirtualTerminalOpen] = useState(false)
  const [editPaymentOpen, setEditPaymentOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  const isAdmin = user?.role === 'admin'
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('processed_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery(
    ['payments', statusFilter, providerFilter, searchQuery, sortBy, sortOrder, page],
    async () => {
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(providerFilter !== 'all' && { payment_provider: providerFilter }),
        ...(searchQuery && { search: searchQuery }),
        sort_by: sortBy,
        sort_order: sortOrder,
        page: page,
      }
      const response = await api.get('/payments', { params })
      return response.data
    }
  )
  
  const handleSearch = () => {
    setSearchQuery(searchTerm)
    setPage(1)
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePageChange = (event, value) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteMutation = useMutation(
    (id) => api.delete(`/payments/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments')
        alert('Payment deleted and invoice balance restored')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to delete payment')
      },
    }
  )

  const deletePayment = (id) => {
    deleteMutation.mutate(id)
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading payments</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Payment History</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setVirtualTerminalOpen(true)}
              startIcon={<CreditCard />}
            >
              Virtual Terminal
            </Button>
            <Button
              variant="contained"
              onClick={() => setPaymentDialogOpen(true)}
              startIcon={<Add />}
            >
              Record Payment
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
            >
              Search
            </Button>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={providerFilter}
              label="Provider"
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="stripe">Stripe</MenuItem>
              <MenuItem value="square">Square</MenuItem>
              <MenuItem value="offline">Offline</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="processed_at">Date</MenuItem>
              <MenuItem value="amount">Amount</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              label="Order"
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              {isAdmin && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {payment.processed_at ? new Date(payment.processed_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>{payment.invoice?.invoice_number || '-'}</TableCell>
                <TableCell>{payment.invoice?.customer?.name || '-'}</TableCell>
                <TableCell>{payment.payment_method?.name || payment.payment_method_type || '-'}</TableCell>
                <TableCell>{payment.payment_provider || 'Offline'}</TableCell>
                <TableCell align="right">${payment.amount?.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={payment.status}
                    color={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                {isAdmin && (
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setEditingPayment(payment)
                        setEditPaymentOpen(true)
                      }}
                      title="Edit Payment"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={() => {
                        if (window.confirm(`Delete payment of $${payment.amount?.toFixed(2)}? This will restore the invoice balance.`)) {
                          deletePayment(payment.id)
                        }
                      }}
                      title="Delete Payment"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data && data.total > data.per_page && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Page {data.current_page} of {data.last_page} ({data.total} total payments)
          </Typography>
          <Pagination
            count={data.last_page}
            page={data.current_page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries('payments')
        }}
      />

      <VirtualTerminal
        open={virtualTerminalOpen}
        onClose={() => setVirtualTerminalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries('payments')
        }}
      />

      <EditPaymentDialog
        open={editPaymentOpen}
        onClose={() => {
          setEditPaymentOpen(false)
          setEditingPayment(null)
        }}
        payment={editingPayment}
        onSuccess={() => {
          queryClient.invalidateQueries('payments')
        }}
      />
    </Container>
  )
}

const EditPaymentDialog = ({ open, onClose, payment, onSuccess }) => {
  const [formData, setFormData] = useState({
    processed_at: '',
    amount: '',
    payment_method_type: '',
    notes: '',
    status: '',
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    if (payment) {
      setFormData({
        processed_at: payment.processed_at ? payment.processed_at.split('T')[0] : '',
        amount: payment.amount || '',
        payment_method_type: payment.payment_method_type || '',
        notes: payment.notes || '',
        status: payment.status || 'completed',
      })
    }
  }, [payment])

  const updateMutation = useMutation(
    (data) => api.put(`/payments/${payment.id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments')
        if (onSuccess) onSuccess()
        alert('Payment updated successfully')
        onClose()
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update payment')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    })
  }

  if (!payment) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Editing payment for Invoice: <strong>{payment.invoice?.invoice_number}</strong>
            </Alert>
            
            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              required
              value={formData.processed_at}
              onChange={(e) => setFormData({ ...formData, processed_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Amount"
              type="number"
              required
              fullWidth
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              inputProps={{ step: '0.01', min: 0 }}
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
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={updateMutation.isLoading}>
            {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

const PaymentDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_provider: 'offline',
    amount: '',
    payment_method_type: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const queryClient = useQueryClient()

  const { data: invoices } = useQuery('unpaid-invoices', async () => {
    const response = await api.get('/invoices', { params: { status: 'sent,overdue' } })
    return response.data
  })

  const mutation = useMutation(
    (data) => api.post('/payments', { ...data, processed_at: data.payment_date }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payments')
        if (onSuccess) onSuccess()
        onClose()
        setFormData({
          invoice_id: '',
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
      invoice_id: parseInt(formData.invoice_id),
      amount: parseFloat(formData.amount),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={invoices?.data || []}
              getOptionLabel={(option) => `${option.invoice_number} - ${option.customer?.name} ($${option.balance?.toFixed(2)})`}
              renderInput={(params) => <TextField {...params} label="Select Invoice" required />}
              value={invoices?.data?.find(inv => inv.id === parseInt(formData.invoice_id)) || null}
              onChange={(e, newValue) => {
                setFormData({
                  ...formData,
                  invoice_id: newValue?.id || '',
                  amount: newValue?.balance || '',
                })
              }}
            />
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
              fullWidth
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              inputProps={{ step: '0.01', min: 0 }}
            />
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Payments

