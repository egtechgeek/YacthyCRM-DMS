import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
} from '@mui/material'
import { ArrowBack as BackIcon } from '@mui/icons-material'
import api from '../services/api'

const CustomerDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)

  const { data: customer, isLoading, error } = useQuery(
    ['customer', id],
    async () => {
      const response = await api.get(`/customers/${id}`)
      return response.data.customer || response.data
    }
  )

  const { data: invoices } = useQuery(
    ['customer-invoices', id],
    async () => {
      const response = await api.get('/invoices', { params: { customer_id: id } })
      return response.data
    },
    { enabled: !!customer }
  )

  const { data: yachts } = useQuery(
    ['customer-yachts', id],
    async () => {
      const response = await api.get('/yachts', { params: { customer_id: id } })
      return response.data
    },
    { enabled: !!customer }
  )

  const { data: vehicles } = useQuery(
    ['customer-vehicles', id],
    async () => {
      const response = await api.get('/vehicles', { params: { customer_id: id } })
      return response.data
    },
    { enabled: !!customer }
  )

  const { data: appointments } = useQuery(
    ['customer-appointments', id],
    async () => {
      const response = await api.get('/appointments', { params: { customer_id: id } })
      return response.data
    },
    { enabled: !!customer }
  )

  // Check if modules are enabled
  const { data: modules } = useQuery('modules', async () => {
    const response = await api.get('/modules')
    return response.data
  })

  const isModuleEnabled = (moduleKey) => {
    if (!modules) return false
    const module = modules.find(m => m.key === moduleKey)
    return module ? module.enabled : false
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error || !customer) {
    return (
      <Container>
        <Alert severity="error">Customer not found</Alert>
        <Button onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          Back to Customers
        </Button>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/customers')}>
          Back
        </Button>
        <Typography variant="h4">{customer.name}</Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Contact Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography><strong>Email:</strong> {customer.email || '-'}</Typography>
            <Typography><strong>Phone:</strong> {customer.phone || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography><strong>Address:</strong></Typography>
            <Typography variant="body2">
              {customer.address || '-'}
              {customer.city && `, ${customer.city}`}
              {customer.state && `, ${customer.state}`}
              {customer.zip && ` ${customer.zip}`}
            </Typography>
            {customer.country && (
              <Typography variant="body2">{customer.country}</Typography>
            )}
          </Grid>
        </Grid>
        {customer.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Notes</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {customer.notes}
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          {isModuleEnabled('yacht') && <Tab label={`Yachts (${yachts?.data?.length || 0})`} />}
          {isModuleEnabled('dms') && <Tab label={`Vehicles (${vehicles?.data?.length || 0})`} />}
          <Tab label={`Invoices (${invoices?.data?.length || 0})`} />
          <Tab label={`Appointments (${appointments?.data?.length || 0})`} />
        </Tabs>

        {/* Yachts Tab */}
        {isModuleEnabled('yacht') && tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>HIN</TableCell>
                  <TableCell>IMO</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {yachts?.data?.map((yacht) => (
                  <TableRow key={yacht.id}>
                    <TableCell>{yacht.name}</TableCell>
                    <TableCell>{yacht.type || '-'}</TableCell>
                    <TableCell>{yacht.hull_identification_number || '-'}</TableCell>
                    <TableCell>{yacht.imo_number || '-'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/yachts/${yacht.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Vehicles Tab */}
        {isModuleEnabled('dms') && tabValue === (isModuleEnabled('yacht') ? 1 : 0) && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>License Plate</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles?.data?.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>{vehicle.vehicle_type}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{vehicle.vin || '-'}</TableCell>
                    <TableCell>{vehicle.license_plate || '-'}</TableCell>
                    <TableCell>
                      <Chip label={vehicle.status} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Invoices Tab - Dynamically calculate tab index */}
        {tabValue === ((isModuleEnabled('yacht') ? 1 : 0) + (isModuleEnabled('dms') ? 1 : 0)) && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice Number</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices?.data?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell align="right">${invoice.total?.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Typography color={invoice.balance > 0 ? 'error' : 'success.main'}>
                        ${invoice.balance?.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status}
                        color={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Appointments Tab - Dynamically calculate tab index */}
        {tabValue === ((isModuleEnabled('yacht') ? 1 : 0) + (isModuleEnabled('dms') ? 1 : 0) + 1) && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Yacht</TableCell>
                  <TableCell>Service Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments?.data?.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      {new Date(appointment.start_time).toLocaleString()}
                    </TableCell>
                    <TableCell>{appointment.yacht?.name || '-'}</TableCell>
                    <TableCell>{appointment.service_type || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={appointment.status}
                        color={appointment.status === 'completed' ? 'success' : appointment.status === 'cancelled' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  )
}

export default CustomerDetails

