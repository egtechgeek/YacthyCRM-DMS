import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Build as BuildIcon,
  ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material'
import api from '../services/api'
import Autocomplete from '@mui/material/Autocomplete'

const WorkOrderForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const returnToPath = `${location.pathname}${location.search}`
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  const defaultCustomerId = searchParams.get('customer_id') || ''

  const [formData, setFormData] = useState({
    customer_id: defaultCustomerId,
    vehicle_id: '',
    invoice_id: '',
    key_tag_number: '',
    assigned_to: '',
    status: 'open',
    priority: 'normal',
    title: '',
    description: '',
    customer_concerns: '',
    work_performed: '',
    parts_needed: '',
    estimated_hours: '',
    actual_hours: '',
    due_date: '',
  })

  const [error, setError] = useState('')
  const [customerInput, setCustomerInput] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim())
    }, 300)

    return () => clearTimeout(handler)
  }, [customerSearch])

  // Fetch customers (searchable)
  const { data: customerResponse, isLoading: customersLoading } = useQuery(
    ['customers-select', debouncedCustomerSearch],
    async () => {
      const params = {
        per_page: 200,
        sort_by: 'name',
        sort_order: 'asc',
      }

      if (debouncedCustomerSearch) {
        params.search = debouncedCustomerSearch
      }

      const response = await api.get('/customers', { params })
      return response.data
    },
    {
      keepPreviousData: true,
    }
  )

  // Fetch work order if editing
  const { data: workOrder } = useQuery(
    ['work-order', id],
    async () => {
      const response = await api.get(`/work-orders/${id}`)
      return response.data.work_order
    },
    {
      enabled: isEdit,
      onSuccess: (data) => {
        setFormData({
          customer_id: data.customer_id || defaultCustomerId,
          vehicle_id: data.vehicle_id || '',
          invoice_id: data.invoice_id || '',
          key_tag_number: data.key_tag_number || '',
          assigned_to: data.assigned_to || '',
          status: data.status || 'open',
          priority: data.priority || 'normal',
          title: data.title || '',
          description: data.description || '',
          customer_concerns: data.customer_concerns || '',
          work_performed: data.work_performed || '',
          parts_needed: data.parts_needed || '',
          estimated_hours: data.estimated_hours || '',
          actual_hours: data.actual_hours || '',
          due_date: data.due_date || '',
        })
        setCustomerInput(data.customer?.name || '')
        setCustomerSearch('')
      },
    }
  )

  const customerOptionsRaw = customerResponse?.data || []
  const preselectedCustomer = workOrder?.customer || null

  useEffect(() => {
    if (!isEdit && formData.customer_id && customerOptionsRaw.length > 0 && !customerInput) {
      const match = customerOptionsRaw.find(option => Number(option.id) === Number(formData.customer_id))
      if (match) {
        setCustomerInput(match.name || '')
      }
    }
  }, [isEdit, formData.customer_id, customerOptionsRaw, customerInput])

  const customerOptions = useMemo(() => {
    if (!formData.customer_id) {
      if (preselectedCustomer && !customerOptionsRaw.some(option => Number(option.id) === Number(preselectedCustomer.id))) {
        return [...customerOptionsRaw, preselectedCustomer]
      }
      return customerOptionsRaw
    }

    const selectedId = Number(formData.customer_id)
    const selectedInList = customerOptionsRaw.some(option => Number(option.id) === selectedId)

    if (selectedInList) {
      return customerOptionsRaw
    }

    if (preselectedCustomer && Number(preselectedCustomer.id) === selectedId) {
      return [...customerOptionsRaw, preselectedCustomer]
    }

    const fallbackCustomer = preselectedCustomer ?? { id: selectedId, name: `Customer #${selectedId}` }

    return [...customerOptionsRaw, fallbackCustomer]
  }, [customerOptionsRaw, formData.customer_id, preselectedCustomer])

  const selectedCustomer = useMemo(() => {
    if (!formData.customer_id) return null
    const id = Number(formData.customer_id)
    return customerOptions.find((customer) => Number(customer.id) === id) || null
  }, [customerOptions, formData.customer_id])

  // Fetch users for assignment
  const { data: users } = useQuery('users-all', async () => {
    const response = await api.get('/users?per_page=1000')
    return response.data.data
  })

  // Fetch vehicles
  const { data: vehicles } = useQuery('vehicles-all', async () => {
    const response = await api.get('/vehicles?per_page=1000')
    return response.data.data
  })

  // Save mutation
  const saveMutation = useMutation(
    (data) => {
      if (isEdit) {
        return api.put(`/work-orders/${id}`, data)
      } else {
        return api.post('/work-orders', data)
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('work-orders')
        queryClient.invalidateQueries('dashboard-stats')
        navigate('/work-orders')
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to save work order')
      },
    }
  )

  const convertMutation = useMutation(
    () => api.post(`/work-orders/${id}/convert-to-invoice`),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('work-orders')
        queryClient.invalidateQueries(['work-order', id])
        const invoiceId = response.data?.invoice?.id ?? response.data?.invoice_id ?? null
        if (invoiceId) {
          navigate(`/invoices/${invoiceId}`)
        } else {
          navigate('/invoices')
        }
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to convert work order to invoice')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    // Clean up empty fields
    const cleanedData = { ...formData }
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null
      }
    })
    
    saveMutation.mutate(cleanedData)
  }

  const customerIdNumber = formData.customer_id ? Number(formData.customer_id) : null

  // Filter vehicles by selected customer
  const filteredVehicles = vehicles?.filter(v => 
    !customerIdNumber || v.customer_id === customerIdNumber
  ) || []

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          <BuildIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 32 }} />
          {isEdit ? 'Edit Work Order' : 'Create Work Order'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isEdit ? `Editing work order ${workOrder?.work_order_number}` : 'Create a new work order for the service department'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Work Order Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                helperText="Brief description of the work needed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                options={customerOptions}
                loading={customersLoading}
                loadingText="Loading customers..."
                value={selectedCustomer}
                inputValue={customerInput}
                onChange={(_, value) => {
                  setError('')
                  setFormData({
                    ...formData,
                    customer_id: value?.id ?? '',
                    vehicle_id: '',
                  })
                  setCustomerInput(value?.name || '')
                  setCustomerSearch('')
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setCustomerInput(value)
                    setCustomerSearch(value)
                  }
                }}
                getOptionLabel={(option) => option?.name || 'Unnamed customer'}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Customer"
                    helperText="Select an existing customer or create a new one"
                    InputLabelProps={{ shrink: true }}
                  />
                )}
                ListboxProps={{
                  style: { maxHeight: 320, overflowY: 'auto' },
                }}
                fullWidth
              />
              <Box sx={{ mt: 1, textAlign: 'right' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setError('')
                    const params = new URLSearchParams({
                      mode: 'create',
                      return_to: returnToPath
                    })
                    navigate(`/customers?${params.toString()}`)
                  }}
                >
                  Create Customer
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Vehicle"
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                disabled={!formData.customer_id}
                helperText={formData.customer_id ? 'Select an existing vehicle or create a new one' : 'Select a customer to choose or create a vehicle'}
              >
                <MenuItem value="">No Vehicle</MenuItem>
                {filteredVehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} 
                    {vehicle.coach_number && ` (Coach #${vehicle.coach_number})`}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ mt: 1, textAlign: 'right' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (!formData.customer_id) {
                      setError('Select a customer before creating a vehicle')
                      return
                    }
                    const params = new URLSearchParams({
                      customer_id: formData.customer_id.toString(),
                      return_to: returnToPath,
                      vehicle_type: 'rv',
                      status: 'service'
                    })
                    navigate(`/vehicles/new?${params.toString()}`)
                  }}
                  disabled={!formData.customer_id}
                >
                  Create Vehicle
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="open">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                required
                fullWidth
                select
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Assigned To"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users?.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Key Tag Number"
                value={formData.key_tag_number}
                onChange={(e) => setFormData({ ...formData, key_tag_number: e.target.value })}
                helperText="Optional key or tag identifier for this work order"
              />
            </Grid>

            {isEdit && formData.invoice_id && (
              <Grid item xs={12}>
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => navigate(`/invoices/${formData.invoice_id}`)}
                    >
                      View Invoice
                    </Button>
                  }
                >
                  This work order is linked to invoice #{workOrder?.invoice?.invoice_number || formData.invoice_id}.
                </Alert>
              </Grid>
            )}

            {/* Work Details */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Work Details</Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Customer Concerns"
                value={formData.customer_concerns}
                onChange={(e) => setFormData({ ...formData, customer_concerns: e.target.value })}
                helperText="What the customer reported as the issue"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                helperText="Detailed description of work to be performed"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Work Performed"
                value={formData.work_performed}
                onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                helperText="Work that has been completed (for tracking)"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Parts Needed"
                value={formData.parts_needed}
                onChange={(e) => setFormData({ ...formData, parts_needed: e.target.value })}
                helperText="List of parts required for this work order"
              />
            </Grid>

            {/* Time & Schedule */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Time & Schedule</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Estimated Hours"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Actual Hours"
                value={formData.actual_hours}
                onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/work-orders')}
                >
                  Cancel
                </Button>
                {isEdit && workOrder?.status === 'completed' && !formData.invoice_id && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<ReceiptLongIcon />}
                    onClick={() => convertMutation.mutate()}
                    disabled={convertMutation.isLoading}
                  >
                    {convertMutation.isLoading ? 'Converting...' : 'Convert to Invoice'}
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={saveMutation.isLoading}
                >
                  {saveMutation.isLoading ? 'Saving...' : isEdit ? 'Update Work Order' : 'Create Work Order'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  )
}

export default WorkOrderForm

