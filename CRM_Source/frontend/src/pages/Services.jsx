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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material'
import api from '../services/api'

const Services = () => {
  const [open, setOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery(['services', searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/services', { params })
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
    (id) => api.delete(`/services/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('services')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading services</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Services Catalog</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingService(null)
              setOpen(true)
            }}
          >
            Add Service
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search services..."
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
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="hourly_rate">Hourly Rate</MenuItem>
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
              <TableCell>Category</TableCell>
              <TableCell>Hourly Rate</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.category || '-'}</TableCell>
                <TableCell>${service.hourly_rate?.toFixed(2)}/hr</TableCell>
                <TableCell>
                  {service.active ? (
                    <Chip label="Active" color="success" size="small" />
                  ) : (
                    <Chip label="Inactive" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => {
                    setEditingService(service)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(service.id)}>
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
            Page {data.current_page} of {data.last_page} ({data.total} total services)
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

      <ServiceDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingService(null)
        }}
        service={editingService}
      />
    </Container>
  )
}

const ServiceDialog = ({ open, onClose, service }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    hourly_rate: '',
    minimum_hours: '',
    active: true,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation(
    (data) => {
      const submitData = {
        ...data,
        hourly_rate: parseFloat(data.hourly_rate) || 0,
        minimum_hours: parseFloat(data.minimum_hours) || null,
        active: data.active === true || data.active === 'true',
      }
      if (service) {
        return api.put(`/services/${service.id}`, submitData)
      }
      return api.post('/services', submitData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('services')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        category: service.category || '',
        hourly_rate: service.hourly_rate || '',
        minimum_hours: service.minimum_hours || '',
        active: service.active !== false,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        hourly_rate: '',
        minimum_hours: '',
        active: true,
      })
    }
  }, [service])

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{service ? 'Edit Service' : 'Add Service'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hourly Rate"
                type="number"
                required
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Minimum Hours"
                type="number"
                value={formData.minimum_hours}
                onChange={(e) => setFormData({ ...formData, minimum_hours: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : service ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Services

