import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Pagination,
  Paper,
} from '@mui/material'
import {
  DirectionsCar as VehicleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const Vehicles = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery(
    ['vehicles', searchQuery, statusFilter, typeFilter, page],
    async () => {
      const params = {
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { vehicle_type: typeFilter }),
        page,
      }
      const response = await api.get('/vehicles', { params })
      return response.data
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/vehicles/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vehicles')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSearch = () => {
    setSearchQuery(searchTerm)
    setPage(1)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'inventory':
        return 'primary'
      case 'sold':
        return 'success'
      case 'service':
        return 'warning'
      case 'consignment':
        return 'info'
      default:
        return 'default'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'car': return '🚗'
      case 'truck': return '🚛'
      case 'suv': return '🚙'
      case 'van': return '🚐'
      case 'rv': return '🚐'
      case 'motorcycle': return '🏍️'
      case 'boat': return '🚤'
      case 'trailer': return '🚛'
      default: return '🚗'
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Typography color="error">Error loading vehicles</Typography></Container>

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              <VehicleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Vehicle/RV Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dealer Management System
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/vehicles/new')}
          >
            Add Vehicle
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by make, model, VIN, license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                size="medium"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                fullWidth
              >
                Search
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="inventory">In Inventory</MenuItem>
                  <MenuItem value="sold">Sold</MenuItem>
                  <MenuItem value="service">In Service</MenuItem>
                  <MenuItem value="consignment">Consignment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="car">Car</MenuItem>
                  <MenuItem value="truck">Truck</MenuItem>
                  <MenuItem value="suv">SUV</MenuItem>
                  <MenuItem value="van">Van</MenuItem>
                  <MenuItem value="rv">RV</MenuItem>
                  <MenuItem value="motorcycle">Motorcycle</MenuItem>
                  <MenuItem value="boat">Boat</MenuItem>
                  <MenuItem value="trailer">Trailer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Vehicle Cards */}
        <Grid container spacing={3}>
          {data?.data?.map((vehicle) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={vehicle.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h5">{getTypeIcon(vehicle.vehicle_type)}</Typography>
                    <Chip
                      label={vehicle.status}
                      color={getStatusColor(vehicle.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Typography>
                  
                  {vehicle.vin && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      VIN: {vehicle.vin}
                    </Typography>
                  )}
                  
                  {vehicle.coach_number && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Coach #: {vehicle.coach_number}
                    </Typography>
                  )}
                  
                  {vehicle.license_plate && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Plate: {vehicle.license_plate}
                    </Typography>
                  )}
                  
                  {vehicle.stock_number && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Stock #: {vehicle.stock_number}
                    </Typography>
                  )}
                  
                  {vehicle.customer && (
                    <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                      Owner: {vehicle.customer.name}
                    </Typography>
                  )}
                  
                  {vehicle.mileage && (
                    <Typography variant="body2" color="text.secondary">
                      {vehicle.mileage.toLocaleString()} miles
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    title="View Details"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(vehicle.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {data && data.total > data.per_page && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Page {data.current_page} of {data.last_page} ({data.total} total vehicles)
            </Typography>
            <Pagination
              count={data.last_page}
              page={data.current_page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>
    </Container>
  )
}

export default Vehicles

