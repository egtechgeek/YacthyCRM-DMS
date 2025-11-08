import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import {
  AccessTime as ClockIcon,
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  Assessment as ReportsIcon,
  BeachAccess as TimeOffIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Timeclock = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: currentEntry, isLoading } = useQuery(
    'current-time-entry',
    async () => {
      const response = await api.get('/timeclock/current')
      return response.data.entry
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const clockInMutation = useMutation(
    (data) => api.post('/timeclock/clock-in', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('current-time-entry')
        setNotes('')
        alert('Clocked in successfully!')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to clock in')
      },
    }
  )

  const clockOutMutation = useMutation(
    (data) => api.post('/timeclock/clock-out', data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('current-time-entry')
        setNotes('')
        setBreakMinutes(0)
        alert(`Clocked out successfully! Total hours: ${response.data.total_hours}`)
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to clock out')
      },
    }
  )

  const handleClockIn = () => {
    if (window.confirm('Clock in now?')) {
      clockInMutation.mutate({ notes })
    }
  }

  const handleClockOut = () => {
    if (window.confirm('Clock out now?')) {
      clockOutMutation.mutate({
        break_minutes: breakMinutes,
        notes: notes || currentEntry?.notes,
      })
    }
  }

  const getElapsedTime = () => {
    if (!currentEntry) return '00:00:00'
    
    const clockIn = new Date(currentEntry.clock_in)
    const diff = currentTime - clockIn
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  const isClockedIn = currentEntry !== null

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          <ClockIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Timeclock
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Track your working hours
        </Typography>

        {/* Quick Action Buttons */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ReportsIcon />}
              onClick={() => navigate('/timeclock/reports')}
            >
              View Reports
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TimeOffIcon />}
              onClick={() => navigate('/timeclock/time-off')}
            >
              Time Off Requests
            </Button>
          </Grid>
        </Grid>

        {/* Current Status Card */}
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: isClockedIn ? '#e8f5e9' : '#fff' }}>
          <Typography variant="h3" sx={{ mb: 2, fontFamily: 'monospace', fontWeight: 'bold' }}>
            {currentTime.toLocaleTimeString()}
          </Typography>
          
          {isClockedIn ? (
            <>
              <Chip 
                label="CLOCKED IN" 
                color="success" 
                sx={{ fontSize: '1rem', py: 2, px: 1, mb: 2 }}
              />
              <Typography variant="h5" sx={{ mt: 2, mb: 1, fontFamily: 'monospace' }}>
                {getElapsedTime()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Since {new Date(currentEntry.clock_in).toLocaleTimeString()}
              </Typography>
            </>
          ) : (
            <Chip 
              label="CLOCKED OUT" 
              color="default" 
              sx={{ fontSize: '1rem', py: 2, px: 1 }}
            />
          )}
        </Paper>

        {/* Clock In/Out Controls */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Typography>

                {isClockedIn && (
                  <TextField
                    fullWidth
                    type="number"
                    label="Break Time (minutes)"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                    sx={{ mb: 2 }}
                    inputProps={{ min: 0, max: 480 }}
                  />
                )}

                <TextField
                  fullWidth
                  label="Notes (optional)"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ mb: 3 }}
                  placeholder="Add any notes about your shift..."
                />

                {isClockedIn ? (
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    fullWidth
                    startIcon={<ClockOutIcon />}
                    onClick={handleClockOut}
                    disabled={clockOutMutation.isLoading}
                    sx={{ py: 2, fontSize: '1.2rem' }}
                  >
                    {clockOutMutation.isLoading ? 'Clocking Out...' : 'CLOCK OUT'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    startIcon={<ClockInIcon />}
                    onClick={handleClockIn}
                    disabled={clockInMutation.isLoading}
                    sx={{ py: 2, fontSize: '1.2rem' }}
                  >
                    {clockInMutation.isLoading ? 'Clocking In...' : 'CLOCK IN'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Summary
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  {isClockedIn 
                    ? 'You are currently clocked in. Don\'t forget to clock out at the end of your shift!' 
                    : 'You are clocked out. Click "CLOCK IN" when you start your shift.'}
                </Alert>

                {currentEntry && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Clock In:</strong> {new Date(currentEntry.clock_in).toLocaleTimeString()}
                    </Typography>
                    {currentEntry.notes && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Notes:</strong> {currentEntry.notes}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" display="block" color="text.secondary">
                  Your time entries are subject to manager approval.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  )
}

export default Timeclock

