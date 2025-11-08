import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  Alert,
} from '@mui/material'
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const BillForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    vendor_id: null,
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ref_number: '',
    tax: 0,
    memo: '',
    terms: '',
  })

  const [items, setItems] = useState([
    { description: '', quantity: 1, rate: 0, amount: 0, account_id: null }
  ])

  const qbColors = {
    primary: '#2c5f2d',
    border: '#c8d7dc',
  }

  const { data: bill } = useQuery(
    ['bill', id],
    () => api.get(`/accounting/bills/${id}`).then(res => res.data),
    { enabled: isEditing }
  )

  const { data: vendors } = useQuery(
    'vendors',
    () => api.get('/accounting/vendors', { params: { per_page: 1000 } }).then(res => res.data.data)
  )

  const { data: accounts } = useQuery(
    'chartOfAccounts',
    () => api.get('/accounting/chart-of-accounts', { params: { per_page: 1000 } }).then(res => res.data.data)
  )

  useEffect(() => {
    if (bill) {
      setFormData({
        vendor_id: bill.vendor_id,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        ref_number: bill.ref_number || '',
        tax: bill.tax || 0,
        memo: bill.memo || '',
        terms: bill.terms || '',
      })
      setItems(bill.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        account_id: item.account_id,
      })))
    }
  }, [bill])

  const saveMutation = useMutation(
    (data) => {
      if (isEditing) {
        return api.put(`/accounting/bills/${id}`, data)
      }
      return api.post('/accounting/bills', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bills')
        navigate('/accounting/bills')
      },
    }
  )

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value

    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate
    }

    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0, account_id: null }])
  }

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems.length ? newItems : [{ description: '', quantity: 1, rate: 0, amount: 0, account_id: null }])
  }

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const total = subtotal + parseFloat(formData.tax || 0)

  const handleSubmit = () => {
    const data = {
      ...formData,
      items: items.filter(item => item.description && item.quantity > 0)
    }
    saveMutation.mutate(data)
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" fontWeight="bold">
              {isEditing ? 'Edit Bill' : 'Enter Bill'}
            </Typography>
            <Button
              startIcon={<BackIcon />}
              onClick={() => navigate('/accounting/bills')}
              sx={{ color: '#fff' }}
            >
              Back to Bills
            </Button>
          </Box>
        </Paper>

        {saveMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveMutation.error?.response?.data?.message || 'Failed to save bill'}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={vendors || []}
                getOptionLabel={(option) => option.vendor_name || ''}
                value={vendors?.find(v => v.id === formData.vendor_id) || null}
                onChange={(e, value) => setFormData({ ...formData, vendor_id: value?.id || null })}
                renderInput={(params) => <TextField {...params} label="Vendor *" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reference Number"
                value={formData.ref_number}
                onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Bill Date *"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date *"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Terms"
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="e.g., Net 30"
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Items</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: qbColors.border }}>
                  <TableCell width="35%">Description *</TableCell>
                  <TableCell width="20%">Account</TableCell>
                  <TableCell width="10%">Qty *</TableCell>
                  <TableCell width="15%">Rate *</TableCell>
                  <TableCell width="15%">Amount</TableCell>
                  <TableCell width="5%"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={accounts || []}
                        getOptionLabel={(option) => `${option.account_number} - ${option.account_name}` || ''}
                        value={accounts?.find(a => a.id === item.account_id) || null}
                        onChange={(e, value) => handleItemChange(index, 'account_id', value?.id || null)}
                        renderInput={(params) => <TextField {...params} />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={item.amount.toFixed(2)}
                        disabled
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeItem(index)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button
            startIcon={<AddIcon />}
            onClick={addItem}
            sx={{ mt: 2 }}
          >
            Add Line
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Memo"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal:</Typography>
                <Typography>${subtotal.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                <Typography>Tax:</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ width: 150 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: 2, pt: 1 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">${total.toFixed(2)}</Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => navigate('/accounting/bills')}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={!formData.vendor_id || items.filter(i => i.description).length === 0 || saveMutation.isLoading}
              sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
            >
              {saveMutation.isLoading ? 'Saving...' : 'Save Bill'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default BillForm

