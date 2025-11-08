import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Alert,
} from '@mui/material'
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material'
import api from '../services/api'

const VehicleForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  const defaultVehicleType = searchParams.get('vehicle_type') || 'rv'
  const defaultStatus = searchParams.get('status') || 'service'
  const returnTo = searchParams.get('return_to') ? decodeURIComponent(searchParams.get('return_to')) : null

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_type: defaultVehicleType,
    year: '',
    make: '',
    model: '',
    vin: '',
    coach_number: '',
    license_plate: '',
    color: '',
    mileage: '',
    purchase_date: '',
    purchase_price: '',
    sale_date: '',
    sale_price: '',
    status: defaultStatus,
    stock_number: '',
    notes: '',
  })

  const { data: customers } = useQuery('customers-all', async () => {
    const response = await api.get('/customers?per_page=1000')
    return response.data.data
  })

  const { data: vehicle } = useQuery(
    ['vehicle', id],
    async () => {
      const response = await api.get(`/vehicles/${id}`)
      return response.data.vehicle
    },
    {
      enabled: isEdit,
      onSuccess: (data) => {
        setFormData({
          customer_id: data.customer_id || '',
          vehicle_type: data.vehicle_type || defaultVehicleType,
          year: data.year || '',
          make: data.make || '',
          model: data.model || '',
          vin: data.vin || '',
          coach_number: data.coach_number || '',
          license_plate: data.license_plate || '',
          color: data.color || '',
          mileage: data.mileage || '',
          purchase_date: data.purchase_date || '',
          purchase_price: data.purchase_price || '',
          sale_date: data.sale_date || '',
          sale_price: data.sale_price || '',
          status: data.status || defaultStatus,
          stock_number: data.stock_number || '',
          notes: data.notes || '',
        })
      },
    }
  )

  const saveMutation = useMutation(
    (data) => {
      if (isEdit) {
        return api.put(`/vehicles/${id}`, data)
      }
      return api.post('/vehicles', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vehicles')
        queryClient.invalidateQueries('vehicles-all')
        navigate(returnTo || '/vehicles')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to save vehicle')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEdit ? 'Edit Vehicle' : 'Add New Vehicle'}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Vehicle Type</InputLabel>
                  <Select
                    value={formData.vehicle_type}
                    label="Vehicle Type"
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  >
                    <MenuItem value="car">Car</MenuItem>
                    <MenuItem value="truck">Truck</MenuItem>
                    <MenuItem value="suv">SUV</MenuItem>
                    <MenuItem value="van">Van</MenuItem>
                    <MenuItem value="rv">RV</MenuItem>
                    <MenuItem value="motorcycle">Motorcycle</MenuItem>
                    <MenuItem value="boat">Boat</MenuItem>
                    <MenuItem value="trailer">Trailer</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="inventory">In Inventory</MenuItem>
                    <MenuItem value="sold">Sold</MenuItem>
                    <MenuItem value="service">In Service</MenuItem>
                    <MenuItem value="consignment">Consignment</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                />
              </Grid>

              <Grid item xs={12} md={4.5}>
                <TextField
                  fullWidth
                  label="Make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4.5}>
                <TextField
                  fullWidth
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="VIN"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  inputProps={{ maxLength: 17 }}
                  helperText="17-character Vehicle Identification Number"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Coach Number"
                  value={formData.coach_number}
                  onChange={(e) => setFormData({ ...formData, coach_number: e.target.value })}
                  helperText="RV/Coach identification number (if applicable)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="License Plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Stock Number"
                  value={formData.stock_number}
                  onChange={(e) => setFormData({ ...formData, stock_number: e.target.value })}
                />
              </Grid>

              {/* Customer Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Customer Information</Typography>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={customers || []}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  value={customers?.find(c => c.id === formData.customer_id) || null}
                  onChange={(e, newValue) => setFormData({ ...formData, customer_id: newValue?.id || '' })}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer (Optional)" />
                  )}
                />
              </Grid>

              {/* Financial Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Financial Information</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Purchase Date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Purchase Price"
                  type="number"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sale Date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sale Price"
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  inputProps={{ min: 0, step: '0.01' }}
                  InputProps={{ startAdornment: '$' }}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={() => navigate('/vehicles')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={saveMutation.isLoading}
                  >
                    {saveMutation.isLoading ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Add Vehicle'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

export default VehicleForm

