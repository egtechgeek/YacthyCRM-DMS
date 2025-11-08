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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Pagination,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon, Search as SearchIcon } from '@mui/icons-material'
import api from '../services/api'

const Yachts = () => {
  const [open, setOpen] = useState(false)
  const [editingYacht, setEditingYacht] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery(['yachts', searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/yachts', { params })
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
    (id) => api.delete(`/yachts/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('yachts')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this yacht?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading yachts</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Yachts</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingYacht(null)
              setOpen(true)
            }}
          >
            Add Yacht
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search yachts..."
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
              <MenuItem value="type">Type</MenuItem>
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
              <TableCell>Customer</TableCell>
              <TableCell>HIN</TableCell>
              <TableCell>IMO</TableCell>
              <TableCell>MMSI</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((yacht) => (
              <TableRow key={yacht.id}>
                <TableCell>{yacht.name}</TableCell>
                <TableCell>{yacht.customer?.name || '-'}</TableCell>
                <TableCell>{yacht.hull_identification_number || '-'}</TableCell>
                <TableCell>{yacht.imo_number || '-'}</TableCell>
                <TableCell>{yacht.mmsi_number || '-'}</TableCell>
                <TableCell>{yacht.type || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/yachts/${yacht.id}`)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => {
                    setEditingYacht(yacht)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(yacht.id)}>
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
            Page {data.current_page} of {data.last_page} ({data.total} total yachts)
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

      <YachtDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingYacht(null)
        }}
        yacht={editingYacht}
      />
    </Container>
  )
}

const YachtDialog = ({ open, onClose, yacht }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    type: '',
    description: '',
    hull_identification_number: '',
    manufacturer_hull_number: '',
    doc_official_number: '',
    imo_number: '',
    mmsi_number: '',
    flag: '',
    length: '',
    breadth: '',
    beam: '',
    draft: '',
    airdraft: '',
    build_year: '',
    net_tonnage: '',
    gross_tonnage: '',
  })

  const queryClient = useQueryClient()

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers')
    return response.data
  })

  const mutation = useMutation(
    (data) => {
      if (yacht) {
        return api.put(`/yachts/${yacht.id}`, data)
      }
      return api.post('/yachts', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('yachts')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (yacht) {
      setFormData({
        customer_id: yacht.customer_id || '',
        name: yacht.name || '',
        type: yacht.type || '',
        description: yacht.description || '',
        hull_identification_number: yacht.hull_identification_number || '',
        manufacturer_hull_number: yacht.manufacturer_hull_number || '',
        doc_official_number: yacht.doc_official_number || '',
        imo_number: yacht.imo_number || '',
        mmsi_number: yacht.mmsi_number || '',
        flag: yacht.flag || '',
        length: yacht.length || '',
        breadth: yacht.breadth || '',
        beam: yacht.beam || '',
        draft: yacht.draft || '',
        airdraft: yacht.airdraft || '',
        build_year: yacht.build_year || '',
        net_tonnage: yacht.net_tonnage || '',
        gross_tonnage: yacht.gross_tonnage || '',
      })
    } else {
      setFormData({
        customer_id: '',
        name: '',
        type: '',
        description: '',
        hull_identification_number: '',
        manufacturer_hull_number: '',
        doc_official_number: '',
        imo_number: '',
        mmsi_number: '',
        flag: '',
        length: '',
        breadth: '',
        beam: '',
        draft: '',
        airdraft: '',
        build_year: '',
        net_tonnage: '',
        gross_tonnage: '',
      })
    }
  }, [yacht])

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      customer_id: parseInt(formData.customer_id),
      length: formData.length ? parseFloat(formData.length) : null,
      breadth: formData.breadth ? parseFloat(formData.breadth) : null,
      beam: formData.beam ? parseFloat(formData.beam) : null,
      draft: formData.draft ? parseFloat(formData.draft) : null,
      airdraft: formData.airdraft ? parseFloat(formData.airdraft) : null,
      build_year: formData.build_year ? parseInt(formData.build_year) : null,
      net_tonnage: formData.net_tonnage ? parseFloat(formData.net_tonnage) : null,
      gross_tonnage: formData.gross_tonnage ? parseFloat(formData.gross_tonnage) : null,
    }
    mutation.mutate(submitData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{yacht ? 'Edit Yacht' : 'Add Yacht'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={customers?.data || []}
              getOptionLabel={(option) => option.name || ''}
              renderInput={(params) => <TextField {...params} label="Customer" required />}
              value={customers?.data?.find(c => c.id === parseInt(formData.customer_id)) || null}
              onChange={(e, newValue) => {
                setFormData({ ...formData, customer_id: newValue?.id || '' })
              }}
            />

            <TextField
              label="Yacht Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextField
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            />

            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>Maritime Identification</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hull Identification Number (HIN)"
                  fullWidth
                  value={formData.hull_identification_number}
                  onChange={(e) => setFormData({ ...formData, hull_identification_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Manufacturer Hull Number"
                  fullWidth
                  value={formData.manufacturer_hull_number}
                  onChange={(e) => setFormData({ ...formData, manufacturer_hull_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="DOC/Official Number"
                  fullWidth
                  value={formData.doc_official_number}
                  onChange={(e) => setFormData({ ...formData, doc_official_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="IMO Number"
                  fullWidth
                  value={formData.imo_number}
                  onChange={(e) => setFormData({ ...formData, imo_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="MMSI Number"
                  fullWidth
                  value={formData.mmsi_number}
                  onChange={(e) => setFormData({ ...formData, mmsi_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Flag"
                  fullWidth
                  value={formData.flag}
                  onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Dimensions</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Length"
                  type="number"
                  fullWidth
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Breadth"
                  type="number"
                  fullWidth
                  value={formData.breadth}
                  onChange={(e) => setFormData({ ...formData, breadth: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Beam"
                  type="number"
                  fullWidth
                  value={formData.beam}
                  onChange={(e) => setFormData({ ...formData, beam: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Draft"
                  type="number"
                  fullWidth
                  value={formData.draft}
                  onChange={(e) => setFormData({ ...formData, draft: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Airdraft"
                  type="number"
                  fullWidth
                  value={formData.airdraft}
                  onChange={(e) => setFormData({ ...formData, airdraft: e.target.value })}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 2 }}>Build Information</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Build Year"
                  type="number"
                  fullWidth
                  value={formData.build_year}
                  onChange={(e) => setFormData({ ...formData, build_year: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Net Tonnage"
                  type="number"
                  fullWidth
                  value={formData.net_tonnage}
                  onChange={(e) => setFormData({ ...formData, net_tonnage: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gross Tonnage"
                  type="number"
                  fullWidth
                  value={formData.gross_tonnage}
                  onChange={(e) => setFormData({ ...formData, gross_tonnage: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : yacht ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Yachts

