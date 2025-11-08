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

const Parts = () => {
  const [open, setOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery(['parts', searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/parts', { params })
    return response.data
  })

  const { data: categories } = useQuery('part-categories', async () => {
    const response = await api.get('/part-categories')
    return response.data
  }, {
    retry: 1,
    onError: (error) => {
      console.error('Failed to load categories:', error)
    }
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
    (id) => api.delete(`/parts/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('parts')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this part?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading parts</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Parts Inventory</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setCategoryDialogOpen(true)}
            >
              Manage Categories
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingPart(null)
                setOpen(true)
              }}
            >
              Add Part
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search parts..."
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
              <MenuItem value="sku">SKU</MenuItem>
              <MenuItem value="price">Price</MenuItem>
              <MenuItem value="stock_quantity">Stock</MenuItem>
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
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((part) => (
              <TableRow key={part.id}>
                <TableCell>{part.sku}</TableCell>
                <TableCell>{part.name}</TableCell>
                <TableCell>{part.category || '-'}</TableCell>
                <TableCell>
                  {part.stock_quantity}
                  {part.low_stock_threshold && part.stock_quantity <= part.low_stock_threshold && (
                    <Chip label="Low Stock" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell>${part.price?.toFixed(2)}</TableCell>
                <TableCell>
                  {part.active ? (
                    <Chip label="Active" color="success" size="small" />
                  ) : (
                    <Chip label="Inactive" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => {
                    setEditingPart(part)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(part.id)}>
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
            Page {data.current_page} of {data.last_page} ({data.total} total parts)
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

      <PartDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingPart(null)
        }}
        part={editingPart}
        categories={categories}
      />

      <CategoryManagementDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
      />
    </Container>
  )
}

const CategoryManagementDialog = ({ open, onClose }) => {
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const queryClient = useQueryClient()

  const { data: categoriesData } = useQuery('part-categories-all', async () => {
    const response = await api.get('/part-categories', { params: { show_all: 'true' } })
    return response.data
  }, { enabled: open })

  useEffect(() => {
    if (categoriesData?.data) {
      setCategories(categoriesData.data)
    }
  }, [categoriesData])

  const createMutation = useMutation(
    (data) => api.post('/part-categories', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('part-categories')
        queryClient.invalidateQueries('part-categories-all')
        setNewCategory({ name: '', description: '' })
      },
    }
  )

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/part-categories/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('part-categories')
        queryClient.invalidateQueries('part-categories-all')
        setEditingCategory(null)
      },
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/part-categories/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('part-categories')
        queryClient.invalidateQueries('part-categories-all')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to delete category')
      },
    }
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Part Categories</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Add New Category</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              label="Category Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              sx={{ flex: 2 }}
            />
            <TextField
              size="small"
              label="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              sx={{ flex: 3 }}
            />
            <Button
              variant="contained"
              onClick={() => createMutation.mutate(newCategory)}
              disabled={!newCategory.name}
            >
              Add
            </Button>
          </Box>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(categories || []).map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  {editingCategory?.id === category.id ? (
                    <TextField
                      size="small"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    />
                  ) : (
                    category.name
                  )}
                </TableCell>
                <TableCell>
                  {editingCategory?.id === category.id ? (
                    <TextField
                      size="small"
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      fullWidth
                    />
                  ) : (
                    category.description || '-'
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={category.active ? 'Active' : 'Inactive'}
                    color={category.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {editingCategory?.id === category.id ? (
                    <>
                      <Button
                        size="small"
                        onClick={() => updateMutation.mutate({ id: category.id, data: editingCategory })}
                      >
                        Save
                      </Button>
                      <Button size="small" onClick={() => setEditingCategory(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <IconButton size="small" onClick={() => setEditingCategory(category)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Delete category "${category.name}"?`)) {
                            deleteMutation.mutate(category.id)
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

const PartDialog = ({ open, onClose, part, categories }) => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit_price: '',
    cost: '',
    stock_quantity: '',
    low_stock_threshold: '',
    location: '',
    vendor_part_number: '',
    manufacturer_part_number: '',
    active: true,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation(
    (data) => {
      const submitData = {
        ...data,
        unit_price: parseFloat(data.unit_price) || 0,
        cost: parseFloat(data.cost) || 0,
        stock_quantity: parseInt(data.stock_quantity) || 0,
        low_stock_threshold: parseInt(data.low_stock_threshold) || null,
        active: data.active === true || data.active === 'true',
      }
      if (part) {
        return api.put(`/parts/${part.id}`, submitData)
      }
      return api.post('/parts', submitData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('parts')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (part) {
      setFormData({
        sku: part.sku || '',
        name: part.name || '',
        description: part.description || '',
        category: part.category || '',
        unit_price: part.unit_price || '',
        cost: part.cost || '',
        stock_quantity: part.stock_quantity || '',
        low_stock_threshold: part.low_stock_threshold || '',
        location: part.location || '',
        vendor_part_number: part.vendor_part_number || '',
        manufacturer_part_number: part.manufacturer_part_number || '',
        active: part.active !== false,
      })
    } else {
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        unit_price: '',
        cost: '',
        stock_quantity: '',
        low_stock_threshold: '',
        location: '',
        vendor_part_number: '',
        manufacturer_part_number: '',
        active: true,
      })
    }
  }, [part])

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{part ? 'Edit Part' : 'Add Part'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="SKU"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ flex: 2 }}
              />
            </Box>
            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="">None</MenuItem>
                  {categories?.data?.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Unit Price"
                type="number"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Stock Quantity"
                type="number"
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Low Stock Threshold"
                type="number"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Vendor Part Number"
                value={formData.vendor_part_number}
                onChange={(e) => setFormData({ ...formData, vendor_part_number: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Manufacturer Part Number"
                value={formData.manufacturer_part_number}
                onChange={(e) => setFormData({ ...formData, manufacturer_part_number: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : part ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Parts

