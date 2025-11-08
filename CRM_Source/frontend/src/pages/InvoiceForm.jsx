import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Save as SaveIcon, ArrowBack as BackIcon } from '@mui/icons-material'
import Autocomplete from '@mui/material/Autocomplete'
import api from '../services/api'
import AssetSelect from '../components/AssetSelect'
import { useAssetLabels } from '../context/AssetLabelContext'

const InvoiceForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const assetLabels = useAssetLabels()

  const { data: invoice, isLoading } = useQuery(
    ['invoice', id],
    async () => {
      const response = await api.get(`/invoices/${id}`)
      return response.data.invoice || response.data
    },
    { enabled: isEdit }
  )

  const [formData, setFormData] = useState({
    customer_id: '',
    yacht_id: '',
    vehicle_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: '',
    notes: '',
    status: 'draft',
  })
  const [items, setItems] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
const [newItem, setNewItem] = useState({
  item_type: 'service',
  mode: 'library',
  part_id: '',
  service_id: '',
  description: '',
  quantity: '1',
  unit_price: '',
  discount: '0',
})
  const [formError, setFormError] = useState('')
  const [customerInput, setCustomerInput] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim())
    }, 300)

    return () => clearTimeout(handler)
  }, [customerSearch])

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

  const customerOptionsRaw = customerResponse?.data || []

  const { data: parts } = useQuery('parts', async () => {
    const response = await api.get('/parts')
    return response.data
  })

  const { data: services } = useQuery('services', async () => {
    const response = await api.get('/services')
    return response.data
  })

  useEffect(() => {
    if (invoice) {
      setFormData({
        customer_id: invoice.customer_id || '',
        yacht_id: invoice.yacht_id || '',
        vehicle_id: invoice.vehicle_id || '',
        issue_date: invoice.issue_date ? invoice.issue_date.split('T')[0] : '',
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        tax_rate: invoice.tax_rate || '',
        notes: invoice.notes || '',
        status: invoice.status || 'draft',
      })
      setItems(invoice.items || [])

      if (invoice.vehicle) {
        setSelectedAsset({
          id: invoice.vehicle.id,
          asset_type: 'vehicle',
          display_name: [invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model].filter(Boolean).join(' ') || invoice.vehicle.name,
        })
      } else if (invoice.yacht) {
        setSelectedAsset({
          id: invoice.yacht.id,
          asset_type: 'yacht',
          display_name: invoice.yacht.name,
        })
      } else {
        setSelectedAsset(null)
      }

      if (invoice.customer) {
        setCustomerInput(invoice.customer.name || '')
      }
      setCustomerSearch('')
    } else {
      setCustomerInput('')
      setCustomerSearch('')
    }
  }, [invoice])

  const mutation = useMutation(
    (data) => {
      if (isEdit) {
        return api.put(`/invoices/${id}`, data)
      }
      return api.post('/invoices', data)
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('invoices')
        const invoiceId = response.data?.invoice?.id || response.data?.id
        if (invoiceId) {
          navigate(`/invoices/${invoiceId}`)
        } else {
          navigate('/invoices')
        }
      },
    }
  )

  const preselectedCustomer = invoice?.customer || null

  const customerOptions = useMemo(() => {
    if (!formData.customer_id) {
      if (preselectedCustomer && !customerOptionsRaw.some((option) => Number(option.id) === Number(preselectedCustomer.id))) {
        return [...customerOptionsRaw, preselectedCustomer]
      }
      return customerOptionsRaw
    }

    const selectedId = Number(formData.customer_id)
    const selectedInList = customerOptionsRaw.some((option) => Number(option.id) === selectedId)

    if (selectedInList) {
      return customerOptionsRaw
    }

    if (preselectedCustomer && Number(preselectedCustomer.id) === selectedId) {
      return [...customerOptionsRaw, preselectedCustomer]
    }

    const fallbackCustomer = invoice?.customer ?? { id: selectedId, name: invoice?.customer?.name || `Customer #${selectedId}` }

    return [...customerOptionsRaw, fallbackCustomer]
  }, [customerOptionsRaw, formData.customer_id, invoice?.customer, preselectedCustomer])

  const selectedCustomer = useMemo(() => {
    if (!formData.customer_id) return null
    const id = Number(formData.customer_id)
    return customerOptions.find((customer) => Number(customer.id) === id) || null
  }, [customerOptions, formData.customer_id])

  const addItem = () => {
    if (!newItem.description || !newItem.unit_price) return

    const item = {
      ...newItem,
      quantity: parseFloat(newItem.quantity) || 1,
      unit_price: parseFloat(newItem.unit_price) || 0,
      discount: parseFloat(newItem.discount) || 0,
      total: (parseFloat(newItem.quantity) || 1) * (parseFloat(newItem.unit_price) || 0) - (parseFloat(newItem.discount) || 0),
    }

    setItems([...items, item])
    setNewItem({
      item_type: 'service',
      mode: 'library',
      part_id: '',
      service_id: '',
      description: '',
      quantity: '1',
      unit_price: '',
      discount: '0',
    })
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate total when quantity, unit_price, or discount changes
    if (['quantity', 'unit_price', 'discount'].includes(field)) {
      const item = updatedItems[index]
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      const discount = parseFloat(item.discount) || 0
      updatedItems[index].total = (qty * price) - discount
    }
    
    setItems(updatedItems)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')

    const customerId = formData.customer_id ? Number(formData.customer_id) : null

    if (!customerId) {
      setFormError('Please select a customer before saving the invoice.')
      return
    }

    const submitData = {
      ...formData,
      customer_id: customerId,
      yacht_id: formData.yacht_id ? parseInt(formData.yacht_id) : null,
      vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
      tax_rate: parseFloat(formData.tax_rate) || 0,
      items: items.map((item, index) => ({
        ...item,
        sort_order: index,
        part_id: item.item_type === 'part' && item.part_id ? parseInt(item.part_id) : null,
        service_id: item.item_type === 'service' && item.service_id ? parseInt(item.service_id) : null,
      })),
    }
    mutation.mutate(submitData)
  }

  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0)
  const taxAmount = subtotal * (parseFloat(formData.tax_rate) || 0) / 100
  const total = subtotal + taxAmount

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/invoices')}>
          Back
        </Button>
        <Typography variant="h4">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      <Paper sx={{ p: 3 }}>
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={customerOptions}
                loading={customersLoading}
                loadingText="Loading customers..."
                value={selectedCustomer}
                inputValue={customerInput}
                onChange={(_, value) => {
                  setSelectedAsset(null)
                  setFormError('')
                  setFormData({
                    ...formData,
                    customer_id: value?.id ?? '',
                    yacht_id: '',
                    vehicle_id: '',
                  })
                  setCustomerInput(value?.name || '')
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
                    label="Customer"
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                )}
                ListboxProps={{
                  style: { maxHeight: 320, overflowY: 'auto' },
                }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AssetSelect
                customerId={formData.customer_id}
                value={selectedAsset}
                onChange={(asset) => {
                  if (!asset) {
                    setSelectedAsset(null)
                    setFormData({ ...formData, yacht_id: '', vehicle_id: '' })
                    return
                  }

                  setSelectedAsset(asset)
                  if (asset.asset_type === 'vehicle') {
                    setFormData({ ...formData, vehicle_id: asset.id, yacht_id: '' })
                  } else {
                    setFormData({ ...formData, yacht_id: asset.id, vehicle_id: '' })
                  }
                }}
                label={`${assetLabels.singular} (Optional)`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tax Rate (%)"
                type="number"
                fullWidth
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
              />
            </Grid>
            {isEdit && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Invoice Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Invoice Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="write-off">Write-Off</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Line Items</Typography>

          <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1, mb: 2 }}>
            {items.map((item, index) => (
              <Box key={index} sx={{ border: '1px solid #ddd', p: 2, mb: 2, borderRadius: 1, bgcolor: '#fafafa' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={1}>
                    <Typography variant="caption" color="text.secondary">
                      {item.item_type === 'part' ? 'Part' : 'Service'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Description"
                      fullWidth
                      size="small"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Quantity"
                      type="number"
                      fullWidth
                      size="small"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Unit Price"
                      type="number"
                      fullWidth
                      size="small"
                      value={item.unit_price || ''}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Discount"
                      type="number"
                      fullWidth
                      size="small"
                      value={item.discount || ''}
                      onChange={(e) => updateItem(index, 'discount', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Total</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ${item.total?.toFixed(2) || '0.00'}
                      </Typography>
                      <Button size="small" color="error" onClick={() => removeItem(index)} sx={{ mt: 1 }}>
                        Remove
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Box sx={{ border: '1px dashed #ddd', p: 2, borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Entry Mode</InputLabel>
                    <Select
                      value={newItem.mode}
                      label="Entry Mode"
                      onChange={(e) => {
                        const mode = e.target.value
                        setNewItem({
                          ...newItem,
                          mode,
                          part_id: '',
                          service_id: '',
                          description: '',
                          unit_price: '',
                        })
                      }}
                    >
                      <MenuItem value="library">Library Item</MenuItem>
                      <MenuItem value="manual">Custom Entry</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newItem.item_type}
                      label="Type"
                      onChange={(e) => {
                        const itemType = e.target.value
                        setNewItem({
                          ...newItem,
                          item_type: itemType,
                          part_id: '',
                          service_id: '',
                          description: '',
                          unit_price: '',
                        })
                      }}
                    >
                      <MenuItem value="service">Service</MenuItem>
                      <MenuItem value="part">Part</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  {newItem.mode === 'library' ? (
                    newItem.item_type === 'part' ? (
                      <FormControl fullWidth size="small" disabled={newItem.mode !== 'library'}>
                        <InputLabel>Part</InputLabel>
                        <Select
                          value={newItem.part_id || ''}
                          label="Part"
                          onChange={(e) => {
                            const part = parts?.data?.find(p => p.id === parseInt(e.target.value))
                            setNewItem({
                              ...newItem,
                              part_id: e.target.value,
                              description: part?.name || '',
                              unit_price: part?.unit_price || '',
                            })
                          }}
                        >
                          {parts?.data?.map((part) => (
                            <MenuItem key={part.id} value={part.id}>
                              {part.name} (${part.unit_price})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <FormControl fullWidth size="small" disabled={newItem.mode !== 'library'}>
                        <InputLabel>Service</InputLabel>
                        <Select
                          value={newItem.service_id || ''}
                          label="Service"
                          onChange={(e) => {
                            const service = services?.data?.find(s => s.id === parseInt(e.target.value))
                            setNewItem({
                              ...newItem,
                              service_id: e.target.value,
                              description: service?.name || '',
                              unit_price: service?.hourly_rate || '',
                            })
                          }}
                        >
                          {services?.data?.map((service) => (
                            <MenuItem key={service.id} value={service.id}>
                              {service.name} (${service.hourly_rate}/hr)
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )
                  ) : (
                    <TextField
                      label="Item Label"
                      size="small"
                      fullWidth
                      placeholder={newItem.item_type === 'part' ? 'Part name/description' : 'Service name/description'}
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Description"
                    size="small"
                    fullWidth
                    placeholder="Line item description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    disabled={newItem.mode === 'library'}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <TextField
                    label="Qty"
                    type="number"
                    size="small"
                    fullWidth
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <TextField
                    label="Price"
                    type="number"
                    size="small"
                    fullWidth
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <TextField
                    label="Discount"
                    type="number"
                    size="small"
                    fullWidth
                    value={newItem.discount}
                    onChange={(e) => setNewItem({ ...newItem, discount: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={1}>
                  <Button variant="contained" size="small" onClick={addItem} fullWidth>
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
            <Typography variant="body2">Subtotal: ${subtotal.toFixed(2)}</Typography>
            <Typography variant="body2">Tax: ${taxAmount.toFixed(2)}</Typography>
            <Typography variant="h6">Total: ${total.toFixed(2)}</Typography>
          </Box>

          <TextField
            label="Notes"
            multiline
            rows={3}
            fullWidth
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => navigate('/invoices')}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  )
}

export default InvoiceForm

