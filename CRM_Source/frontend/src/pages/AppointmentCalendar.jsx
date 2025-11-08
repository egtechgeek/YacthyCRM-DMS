import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'

const AppointmentCalendar = () => {
  const assetLabels = useAssetLabels()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [viewingAppointment, setViewingAppointment] = useState(null)

  const { data: appointments, isLoading, error } = useQuery(
    'appointments',
    async () => {
      const response = await api.get('/appointments')
      return response.data
    }
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

  if (error) {
    return (
      <Container>
        <Alert severity="error">Error loading appointments</Alert>
      </Container>
    )
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getAppointmentsForDate = (date) => {
    if (!date || !appointments?.data) return []
    return appointments.data.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const days = getDaysInMonth(selectedDate)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const previousMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
  }

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Appointment Calendar</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/appointments'}
        >
          Add Appointment
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button onClick={previousMonth}>Previous</Button>
          <Typography variant="h5">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Typography>
          <Button onClick={nextMonth}>Next</Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {dayNames.map(day => (
            <Box key={day} sx={{ p: 1, textAlign: 'center', fontWeight: 'bold' }}>
              {day}
            </Box>
          ))}
          {days.map((day, index) => {
            const dayAppointments = day ? getAppointmentsForDate(day) : []
            const isToday = day && day.toDateString() === new Date().toDateString()
            
            return (
              <Box
                key={index}
                sx={{
                  minHeight: 100,
                  p: 1,
                  border: '1px solid #ddd',
                  bgcolor: isToday ? '#e3f2fd' : 'white',
                  cursor: day ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (dayAppointments.length > 0) {
                    setViewingAppointment(dayAppointments[0])
                    setOpen(true)
                  }
                }}
              >
                {day && (
                  <>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      {day.getDate()}
                    </Typography>
                    {dayAppointments.slice(0, 3).map((apt, idx) => (
                      <Box
                        key={apt.id}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          p: 0.5,
                          mb: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${apt.customer?.name} - ${apt.service_type}`}
                      >
                        {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {apt.customer?.name}
                      </Box>
                    ))}
                    {dayAppointments.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayAppointments.length - 3} more
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            )
          })}
        </Box>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Appointment Details</DialogTitle>
        <DialogContent>
          {viewingAppointment && (
            <Box>
              <TextField
                label="Customer"
                fullWidth
                value={viewingAppointment.customer?.name || '-'}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label={assetLabels.singular}
                fullWidth
                value={viewingAppointment.vehicle ? [viewingAppointment.vehicle.year, viewingAppointment.vehicle.make, viewingAppointment.vehicle.model].filter(Boolean).join(' ') || viewingAppointment.vehicle.name : viewingAppointment.yacht?.name || '-'}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Start Time"
                fullWidth
                value={new Date(viewingAppointment.start_time).toLocaleString()}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Service Type"
                fullWidth
                value={viewingAppointment.service_type || '-'}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={viewingAppointment.description || '-'}
                disabled
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {viewingAppointment && (
            <Button
              variant="contained"
              onClick={() => {
                setOpen(false)
                window.location.href = `/appointments/${viewingAppointment.id}`
              }}
            >
              View Full Details
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default AppointmentCalendar

