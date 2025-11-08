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

const YachtDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)

  const { data: yacht, isLoading, error } = useQuery(
    ['yacht', id],
    async () => {
      const response = await api.get(`/yachts/${id}`)
      return response.data.yacht || response.data
    }
  )

  const { data: maintenanceSchedules } = useQuery(
    ['yacht-maintenance', id],
    async () => {
      const response = await api.get('/maintenance/schedules', { params: { yacht_id: id } })
      return response.data
    },
    { enabled: !!yacht }
  )

  const { data: maintenanceHistory } = useQuery(
    ['yacht-maintenance-history', id],
    async () => {
      const response = await api.get('/maintenance/history', { params: { yacht_id: id } })
      return response.data
    },
    { enabled: !!yacht }
  )

  const { data: appointments } = useQuery(
    ['yacht-appointments', id],
    async () => {
      const response = await api.get('/appointments', { params: { yacht_id: id } })
      return response.data
    },
    { enabled: !!yacht }
  )

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error || !yacht) {
    return (
      <Container>
        <Alert severity="error">Yacht not found</Alert>
        <Button onClick={() => navigate('/yachts')} sx={{ mt: 2 }}>
          Back to Yachts
        </Button>
      </Container>
    )
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/yachts')}>
          Back
        </Button>
        <Typography variant="h4">{yacht.name}</Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Basic Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography><strong>Customer:</strong> {yacht.customer?.name || '-'}</Typography>
            <Typography><strong>Type:</strong> {yacht.type || '-'}</Typography>
            <Typography><strong>Description:</strong> {yacht.description || '-'}</Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Maritime Identification</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>HIN:</strong> {yacht.hull_identification_number || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>Manufacturer Hull #:</strong> {yacht.manufacturer_hull_number || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>DOC/Official #:</strong> {yacht.doc_official_number || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>IMO Number:</strong> {yacht.imo_number || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>MMSI Number:</strong> {yacht.mmsi_number || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>Flag:</strong> {yacht.flag || '-'}</Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Dimensions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography><strong>Length:</strong> {yacht.length ? `${yacht.length}m` : '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography><strong>Breadth:</strong> {yacht.breadth ? `${yacht.breadth}m` : '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography><strong>Beam:</strong> {yacht.beam ? `${yacht.beam}m` : '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography><strong>Draft:</strong> {yacht.draft ? `${yacht.draft}m` : '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography><strong>Airdraft:</strong> {yacht.airdraft ? `${yacht.airdraft}m` : '-'}</Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Build Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>Build Year:</strong> {yacht.build_year || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>Net Tonnage:</strong> {yacht.net_tonnage || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography><strong>Gross Tonnage:</strong> {yacht.gross_tonnage || '-'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label={`Maintenance Schedules (${maintenanceSchedules?.data?.length || 0})`} />
          <Tab label={`Maintenance History (${maintenanceHistory?.data?.length || 0})`} />
          <Tab label={`Appointments (${appointments?.data?.length || 0})`} />
        </Tabs>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Next Due</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceSchedules?.data?.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.task_description}</TableCell>
                    <TableCell>{schedule.frequency}</TableCell>
                    <TableCell>
                      {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={schedule.active ? 'Active' : 'Inactive'}
                        color={schedule.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Completed By</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenanceHistory?.data?.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      {history.completed_at ? new Date(history.completed_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{history.maintenance_schedule?.task_description || '-'}</TableCell>
                    <TableCell>{history.completed_by || '-'}</TableCell>
                    <TableCell>{history.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 2 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
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

export default YachtDetails

