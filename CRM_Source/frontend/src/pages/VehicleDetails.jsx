import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Grid,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const VehicleDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [currentTab, setCurrentTab] = useState(0)
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)

  const isAdmin = ['admin', 'office_staff'].includes(user?.role)

  const { data: vehicle, isLoading } = useQuery(['vehicle', id], async () => {
    const response = await api.get(`/vehicles/${id}`)
    return response.data.vehicle
  })

  if (isLoading) {
    return <Container><Typography>Loading...</Typography></Container>
  }

  if (!vehicle) {
    return <Container><Alert severity="error">Vehicle not found</Alert></Container>
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'inventory': return 'primary'
      case 'sold': return 'success'
      case 'service': return 'warning'
      case 'consignment': return 'info'
      default: return 'default'
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Typography>
            <Chip label={vehicle.status} color={getStatusColor(vehicle.status)} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/vehicles/${id}/edit`)}
            >
              Edit Vehicle
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="Details" />
            <Tab label="Service History" />
            <Tab label="Documents" />
          </Tabs>
        </Paper>

        {/* Tab 0: Vehicle Details */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Vehicle Type</Typography>
                      <Typography variant="body1">{vehicle.vehicle_type}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Year</Typography>
                      <Typography variant="body1">{vehicle.year || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Make</Typography>
                      <Typography variant="body1">{vehicle.make || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Model</Typography>
                      <Typography variant="body1">{vehicle.model || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Color</Typography>
                      <Typography variant="body1">{vehicle.color || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Mileage</Typography>
                      <Typography variant="body1">{vehicle.mileage ? vehicle.mileage.toLocaleString() : 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Identification</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">VIN</Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{vehicle.vin || 'N/A'}</Typography>
                    </Grid>
                    {vehicle.coach_number && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Coach Number</Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{vehicle.coach_number}</Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">License Plate</Typography>
                      <Typography variant="body1">{vehicle.license_plate || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Stock Number</Typography>
                      <Typography variant="body1">{vehicle.stock_number || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {vehicle.customer && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Customer</Typography>
                    <Typography variant="body1">{vehicle.customer.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{vehicle.customer.email}</Typography>
                    <Typography variant="body2" color="text.secondary">{vehicle.customer.phone}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {(vehicle.purchase_price || vehicle.sale_price) && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Financial</Typography>
                    <Grid container spacing={2}>
                      {vehicle.purchase_price && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Purchase Date</Typography>
                            <Typography variant="body1">{vehicle.purchase_date || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Purchase Price</Typography>
                            <Typography variant="body1">${parseFloat(vehicle.purchase_price).toLocaleString()}</Typography>
                          </Grid>
                        </>
                      )}
                      {vehicle.sale_price && (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Sale Date</Typography>
                            <Typography variant="body1">{vehicle.sale_date || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Sale Price</Typography>
                            <Typography variant="body1">${parseFloat(vehicle.sale_price).toLocaleString()}</Typography>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {vehicle.notes && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Notes</Typography>
                    <Typography variant="body2">{vehicle.notes}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 1: Service History */}
        <TabPanel value={currentTab} index={1}>
          <ServiceHistoryTab vehicleId={id} isAdmin={isAdmin} />
        </TabPanel>

        {/* Tab 2: Documents */}
        <TabPanel value={currentTab} index={2}>
          <DocumentsTab vehicleId={id} isAdmin={isAdmin} />
        </TabPanel>
      </Box>
    </Container>
  )
}

// Service History Tab Component
const ServiceHistoryTab = ({ vehicleId, isAdmin }) => {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    service_date: '',
    service_type: '',
    description: '',
    cost: '',
    mileage: '',
    notes: '',
  })

  const { data: serviceHistory } = useQuery(['vehicle-service', vehicleId], async () => {
    const response = await api.get('/vehicle-service', { params: { vehicle_id: vehicleId } })
    return response.data.data
  })

  const createMutation = useMutation(
    (data) => api.post('/vehicle-service', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle-service', vehicleId])
        setDialogOpen(false)
        setFormData({ service_date: '', service_type: '', description: '', cost: '', mileage: '', notes: '' })
        alert('Service record added successfully')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({ ...formData, vehicle_id: vehicleId })
  }

  return (
    <>
      {isAdmin && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ mb: 2 }}
        >
          Add Service Record
        </Button>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Mileage</TableCell>
              <TableCell>Technician</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceHistory?.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{new Date(service.service_date).toLocaleDateString()}</TableCell>
                <TableCell>{service.service_type || 'General'}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>{service.cost ? `$${parseFloat(service.cost).toFixed(2)}` : 'N/A'}</TableCell>
                <TableCell>{service.mileage ? service.mileage.toLocaleString() : 'N/A'}</TableCell>
                <TableCell>{service.technician?.name || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add Service Record</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="Service Date"
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="Service Type"
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                placeholder="e.g., Oil Change, Tire Rotation, etc."
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Cost"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{ startAdornment: '$' }}
              />
              <TextField
                fullWidth
                type="number"
                label="Mileage"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                inputProps={{ min: 0 }}
              />
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? 'Adding...' : 'Add Service'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}

// Documents Tab Component
const DocumentsTab = ({ vehicleId, isAdmin }) => {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    document_type: 'other',
    file: null,
    expiration_date: '',
    notes: '',
  })

  const { data: documents } = useQuery(['vehicle-documents', vehicleId], async () => {
    const response = await api.get('/vehicle-documents', { params: { vehicle_id: vehicleId } })
    return response.data
  })

  const uploadMutation = useMutation(
    (data) => {
      const formData = new FormData()
      Object.keys(data).forEach(key => {
        if (data[key]) formData.append(key, data[key])
      })
      return api.post('/vehicle-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle-documents', vehicleId])
        setDialogOpen(false)
        setFormData({ document_type: 'other', file: null, expiration_date: '', notes: '' })
        alert('Document uploaded successfully')
      },
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/vehicle-documents/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['vehicle-documents', vehicleId])
        alert('Document deleted successfully')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    uploadMutation.mutate({ ...formData, vehicle_id: vehicleId })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this document?')) {
      deleteMutation.mutate(id)
    }
  }

  const getDocumentIcon = (type) => {
    return '📄'
  }

  return (
    <>
      {isAdmin && (
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ mb: 2 }}
        >
          Upload Document
        </Button>
      )}

      <Grid container spacing={2}>
        {documents?.map((doc) => (
          <Grid item xs={12} sm={6} md={4} key={doc.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{getDocumentIcon(doc.document_type)}</Typography>
                    <Typography variant="body1" gutterBottom>{doc.document_type.replace('_', ' ')}</Typography>
                    <Typography variant="caption" display="block">{doc.original_filename}</Typography>
                    {doc.expiration_date && (
                      <Chip
                        label={`Expires: ${new Date(doc.expiration_date).toLocaleDateString()}`}
                        size="small"
                        color={doc.is_expired ? 'error' : 'default'}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => window.open(doc.url, '_blank')}>
                      <DownloadIcon />
                    </IconButton>
                    {isAdmin && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(doc.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={formData.document_type}
                  label="Document Type"
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                >
                  <MenuItem value="title">Title</MenuItem>
                  <MenuItem value="registration">Registration</MenuItem>
                  <MenuItem value="inspection">Inspection</MenuItem>
                  <MenuItem value="insurance">Insurance</MenuItem>
                  <MenuItem value="bill_of_sale">Bill of Sale</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>

              <Button variant="outlined" component="label" fullWidth>
                {formData.file ? formData.file.name : 'Choose File'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                  required
                />
              </Button>

              <TextField
                fullWidth
                type="date"
                label="Expiration Date (Optional)"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={uploadMutation.isLoading || !formData.file}>
              {uploadMutation.isLoading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}

export default VehicleDetails

