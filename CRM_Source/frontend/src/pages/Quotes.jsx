import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Pagination,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, Search as SearchIcon } from '@mui/icons-material'
import api from '../services/api'
import AssetSelect from '../components/AssetSelect'
import { useAssetLabels } from '../context/AssetLabelContext'

const Quotes = () => {
  const assetLabels = useAssetLabels()
  const [open, setOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery(['quotes', statusFilter, searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/quotes', { params })
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

  const deleteMutation = useMutation(
    (id) => api.delete(`/quotes/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotes')
      },
    }
  )

  const convertMutation = useMutation(
    (id) => api.post(`/quotes/${id}/convert-to-invoice`),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('quotes')
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

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleConvert = (id) => {
    if (window.confirm('Convert this quote to an invoice?')) {
      convertMutation.mutate(id)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      accepted: 'success',
      rejected: 'error',
      expired: 'warning',
    }
    return colors[status] || 'default'
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading quotes</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Quotes</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingQuote(null)
              setOpen(true)
            }}
          >
            Add Quote
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search quotes..."
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
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="created_at">Date Created</MenuItem>
              <MenuItem value="quote_number">Quote #</MenuItem>
              <MenuItem value="expiration_date">Expiration</MenuItem>
              <MenuItem value="total">Total</MenuItem>
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
              <TableCell>Quote Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>{assetLabels.short}</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell>{quote.quote_number}</TableCell>
                <TableCell>{quote.customer?.name || '-'}</TableCell>
                <TableCell>{quote.vehicle ? [quote.vehicle.year, quote.vehicle.make, quote.vehicle.model].filter(Boolean).join(' ') || quote.vehicle.name : quote.yacht?.name || '-'}</TableCell>
                <TableCell>${quote.total?.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip label={quote.status} color={getStatusColor(quote.status)} size="small" />
                </TableCell>
                <TableCell>
                  {quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/quotes/${quote.id}`)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => {
                    setEditingQuote(quote)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  {quote.status === 'accepted' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleConvert(quote.id)}
                      sx={{ ml: 1 }}
                    >
                      Convert
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => handleDelete(quote.id)}>
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
            Page {data.current_page} of {data.last_page} ({data.total} total quotes)
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

      <QuoteDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingQuote(null)
        }}
        quote={editingQuote}
        assetLabels={assetLabels}
      />
    </Container>
  )
}

const QuoteDialog = ({ open, onClose, quote, assetLabels }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    yacht_id: '',
    vehicle_id: '',
    expiration_date: '',
    tax_rate: '',
    notes: '',
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

  const queryClient = useQueryClient()

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

  const mutation = useMutation(
    (data) => {
      if (quote) {
        return api.put(`/quotes/${quote.id}`, data)
      }
      return api.post('/quotes', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotes')
        onClose()
      },
    }
  )

  const preselectedCustomer = quote?.customer || null

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

    const fallbackCustomer = quote?.customer ?? { id: selectedId, name: quote?.customer?.name || `Customer #${selectedId}` }

    return [...customerOptionsRaw, fallbackCustomer]
  }, [customerOptionsRaw, formData.customer_id, preselectedCustomer, quote?.customer])

  const selectedCustomer = useMemo(() => {
    if (!formData.customer_id) return null
    const id = Number(formData.customer_id)
    return customerOptions.find((customer) => Number(customer.id) === id) || null
  }, [customerOptions, formData.customer_id])

  useEffect(() => {
    if (quote) {
      setFormData({
        customer_id: quote.customer_id || '',
        yacht_id: quote.yacht_id || '',
        vehicle_id: quote.vehicle_id || '',
        expiration_date: quote.expiration_date ? quote.expiration_date.split('T')[0] : '',
        tax_rate: quote.tax_rate || '',
        notes: quote.notes || '',
      })
      setItems(quote.items || [])
      if (quote.vehicle) {
        setSelectedAsset({
          id: quote.vehicle.id,
          asset_type: 'vehicle',
          display_name: [quote.vehicle.year, quote.vehicle.make, quote.vehicle.model].filter(Boolean).join(' ') || quote.vehicle.name,
        })
      } else if (quote.yacht) {
        setSelectedAsset({ id: quote.yacht.id, asset_type: 'yacht', display_name: quote.yacht.name })
      } else {
        setSelectedAsset(null)
      }

      if (quote.customer) {
        setCustomerInput(quote.customer.name || '')
      }
    } else {
      setFormData({
        customer_id: '',
        yacht_id: '',
        vehicle_id: '',
        expiration_date: '',
        tax_rate: '',
        notes: '',
      })
      setItems([])
      setSelectedAsset(null)
      setCustomerInput('')
      setCustomerSearch('')
    }
  }, [quote])

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

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')

    const customerId = formData.customer_id ? Number(formData.customer_id) : null

    if (!customerId) {
      setFormError('Please select a customer before saving the quote.')
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{quote ? 'Edit Quote' : 'Add Quote'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
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
                    setFormData({ ...formData, customer_id: value?.id ?? '', yacht_id: '', vehicle_id: '' })
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
                  label="Expiration Date"
                  type="date"
                  fullWidth
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
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
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Line Items</Typography>

            <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
              {items.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2"><strong>{item.item_type === 'part' ? 'Part' : 'Service'}:</strong> {item.description}</Typography>
                    <Typography variant="caption">Qty: {item.quantity} × ${item.unit_price} - ${item.discount} = ${item.total?.toFixed(2)}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => removeItem(index)}>
                    <DeleteIcon />
                  </IconButton>
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
                    <Button variant="contained" size="small" onClick={addItem} fullWidth>
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Typography variant="body2">Subtotal: ${subtotal.toFixed(2)}</Typography>
              <Typography variant="body2">Tax: ${taxAmount.toFixed(2)}</Typography>
              <Typography variant="h6">Total: ${total.toFixed(2)}</Typography>
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
            {mutation.isLoading ? 'Saving...' : quote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Quotes

