import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Email as EmailIcon,
} from '@mui/icons-material'
import api from '../services/api'
import InviteCustomerDialog from '../components/InviteCustomerDialog'
import { useAuth } from '../contexts/AuthContext'

const Customers = () => {
  const [open, setOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteCustomer, setInviteCustomer] = useState(null)
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const returnTo = searchParams.get('return_to') ? decodeURIComponent(searchParams.get('return_to')) : null
  const shouldAutoCreate = searchParams.get('mode') === 'create'
  const canSendInvitation = !!authUser?.permissions?.email_invites?.includes('send')

  const { data, isLoading, error } = useQuery(['customers', searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/customers', { params })
    return response.data
  })
  
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

  useEffect(() => {
    if (shouldAutoCreate) {
      setEditingCustomer(null)
      setOpen(true)
    }
  }, [shouldAutoCreate])

  const clearDialogParams = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('mode')
    params.delete('return_to')
    if ([...params].length) {
      setSearchParams(params)
    } else {
      setSearchParams({})
    }
  }

  const closeDialog = () => {
    setOpen(false)
    setEditingCustomer(null)
    if (shouldAutoCreate || returnTo) {
      clearDialogParams()
    }
  }

  const handleCustomerCreated = (newCustomer) => {
    closeDialog()
    if (returnTo && newCustomer?.id) {
      const [pathName, query] = returnTo.split('?')
      const params = new URLSearchParams(query || '')
      params.set('customer_id', newCustomer.id)
      navigate(`${pathName}?${params.toString()}`)
    }
  }

  const deleteMutation = useMutation(
    (id) => api.delete(`/customers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading customers</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Customers</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingCustomer(null)
              setOpen(true)
              clearDialogParams()
            }}
          >
            Add Customer
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="created_at">Date Added</MenuItem>
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>City</TableCell>
              <TableCell>State</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>{customer.city || '-'}</TableCell>
                <TableCell>{customer.state || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/customers/${customer.id}`)}>
                    <ViewIcon />
                  </IconButton>
                  {canSendInvitation && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setInviteCustomer(customer)
                        setInviteOpen(true)
                      }}
                      title="Send Invitation"
                    >
                      <EmailIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => {
                    setEditingCustomer(customer)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(customer.id)}>
                    <DeleteIcon />
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
            Page {data.current_page} of {data.last_page} ({data.total} total customers)
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

      <CustomerDialog
        open={open}
        onClose={closeDialog}
        customer={editingCustomer}
        onCreated={handleCustomerCreated}
      />
      <InviteCustomerDialog
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false)
          setInviteCustomer(null)
        }}
        customer={inviteCustomer}
      />
    </Container>
  )
}

const CustomerDialog = ({ open, onClose, customer, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: '',
    notes: '',
  })
  const [errorMessage, setErrorMessage] = useState('')

  const queryClient = useQueryClient()

  const mutation = useMutation(
    (data) => {
      if (customer) {
        return api.put(`/customers/${customer.id}`, data)
      }
      return api.post('/customers', data)
    },
    {
      onSuccess: (response) => {
        setErrorMessage('')
        queryClient.invalidateQueries('customers')
        queryClient.invalidateQueries('customers-all')
        const newCustomer = response.data?.customer
        if (customer) {
          onClose()
        } else if (onCreated && newCustomer) {
          onCreated(newCustomer)
        } else {
          onClose()
        }
      },
      onError: (error) => {
        const validationErrors = error.response?.data?.errors
        if (validationErrors) {
          const messages = Object.values(validationErrors).flat()
          setErrorMessage(messages.join(' '))
        } else {
          setErrorMessage(error.response?.data?.message || 'Failed to save customer. Please try again.')
        }
      },
    }
  )

  useEffect(() => {
    setErrorMessage('')
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        country: customer.country || '',
        billing_address: customer.billing_address || '',
        billing_city: customer.billing_city || '',
        billing_state: customer.billing_state || '',
        billing_zip: customer.billing_zip || '',
        billing_country: customer.billing_country || '',
        notes: customer.notes || '',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_zip: '',
        billing_country: '',
        notes: '',
      })
    }
  }, [customer])

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value === '' ? null : value])
    )

    mutation.mutate(cleanedData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              label="Address"
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="ZIP"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <Typography variant="h6" sx={{ mt: 2 }}>Billing Address</Typography>
            <TextField
              label="Billing Address"
              multiline
              rows={2}
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Billing City"
                value={formData.billing_city}
                onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Billing State"
                value={formData.billing_state}
                onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Billing ZIP"
                value={formData.billing_zip}
                onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : customer ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Customers

