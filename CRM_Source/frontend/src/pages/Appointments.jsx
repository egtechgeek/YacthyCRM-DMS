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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Pagination,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import api from '../services/api'
import AssetSelect from '../components/AssetSelect'
import { useAssetLabels } from '../context/AssetLabelContext'

const Appointments = () => {
  const [open, setOpen] = useState(false)
  const assetLabels = useAssetLabels()
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery(['appointments', page], async () => {
    const response = await api.get('/appointments', { params: { page } })
    return response.data
  })

  const handlePageChange = (event, value) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteMutation = useMutation(
    (id) => api.delete(`/appointments/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading appointments</Alert></Container>

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Appointments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingAppointment(null)
            setOpen(true)
          }}
        >
          Add Appointment
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>{assetLabels.short}</TableCell>
              <TableCell>Service Type</TableCell>
              <TableCell>Staff</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>
                  {new Date(appointment.start_time).toLocaleString()}
                </TableCell>
                <TableCell>{appointment.customer?.name || '-'}</TableCell>
                <TableCell>{appointment.vehicle ? [appointment.vehicle.year, appointment.vehicle.make, appointment.vehicle.model].filter(Boolean).join(' ') || appointment.vehicle.name : appointment.yacht?.name || '-'}</TableCell>
                <TableCell>{appointment.service_type || '-'}</TableCell>
                <TableCell>{appointment.staff_member || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={appointment.status}
                    color={appointment.status === 'completed' ? 'success' : appointment.status === 'cancelled' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => {
                    setEditingAppointment(appointment)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(appointment.id)}>
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
            Page {data.current_page} of {data.last_page} ({data.total} total appointments)
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

      <AppointmentDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingAppointment(null)
        }}
        appointment={editingAppointment}
        assetLabels={assetLabels}
      />
    </Container>
  )
}

const AppointmentDialog = ({ open, onClose, appointment, assetLabels }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    yacht_id: '',
    vehicle_id: '',
    start_time: '',
    end_time: '',
    service_type: '',
    description: '',
    staff_member: '',
    status: 'scheduled',
  })
  const [selectedAsset, setSelectedAsset] = useState(null)

  const queryClient = useQueryClient()

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers')
    return response.data
  })

  const { data: users } = useQuery('users', async () => {
    const response = await api.get('/users')
    return response.data
  })

  const mutation = useMutation(
    (data) => {
      const submitData = {
        ...data,
        customer_id: parseInt(data.customer_id),
        yacht_id: data.yacht_id ? parseInt(data.yacht_id) : null,
        vehicle_id: data.vehicle_id ? parseInt(data.vehicle_id) : null,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
      }
      if (appointment) {
        return api.put(`/appointments/${appointment.id}`, submitData)
      }
      return api.post('/appointments', submitData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('appointments')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (appointment) {
      setFormData({
        customer_id: appointment.customer_id || '',
        yacht_id: appointment.yacht_id || '',
        vehicle_id: appointment.vehicle_id || '',
        start_time: appointment.start_time ? new Date(appointment.start_time).toISOString().slice(0, 16) : '',
        end_time: appointment.end_time ? new Date(appointment.end_time).toISOString().slice(0, 16) : '',
        service_type: appointment.service_type || '',
        description: appointment.description || '',
        staff_member: appointment.staff_member || '',
        status: appointment.status || 'scheduled',
      })
      if (appointment.vehicle) {
        setSelectedAsset({
          id: appointment.vehicle.id,
          asset_type: 'vehicle',
          display_name: [appointment.vehicle.year, appointment.vehicle.make, appointment.vehicle.model].filter(Boolean).join(' ') || appointment.vehicle.name,
        })
      } else if (appointment.yacht) {
        setSelectedAsset({
          id: appointment.yacht.id,
          asset_type: 'yacht',
          display_name: appointment.yacht.name,
        })
      } else {
        setSelectedAsset(null)
      }
    } else {
      const now = new Date()
      now.setMinutes(0)
      const endTime = new Date(now.getTime() + 60 * 60 * 1000)
      setFormData({
        customer_id: '',
        yacht_id: '',
        vehicle_id: '',
        start_time: now.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16),
        service_type: '',
        description: '',
        staff_member: '',
        status: 'scheduled',
      })
      setSelectedAsset(null)
    }
  }, [appointment])

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{appointment ? 'Edit Appointment' : 'Add Appointment'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Customer</InputLabel>
              <Select
                value={formData.customer_id}
                label="Customer"
                onChange={(e) => {
                  setSelectedAsset(null)
                  setFormData({ ...formData, customer_id: e.target.value, yacht_id: '', vehicle_id: '' })
                }}
              >
                {customers?.data?.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <AssetSelect
              customerId={formData.customer_id}
              value={selectedAsset}
              required={assetLabels.dmsEnabled && !assetLabels.yachtEnabled}
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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Time"
                  type="datetime-local"
                  fullWidth
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Time"
                  type="datetime-local"
                  fullWidth
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Service Type"
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Staff Member</InputLabel>
              <Select
                value={formData.staff_member}
                label="Staff Member"
                onChange={(e) => setFormData({ ...formData, staff_member: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {users?.data?.filter(u => u.role === 'staff' || u.role === 'admin').map((user) => (
                  <MenuItem key={user.id} value={user.name}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : appointment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Appointments

