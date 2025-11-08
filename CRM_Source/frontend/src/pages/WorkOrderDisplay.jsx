import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Build as BuildIcon,
  Person as PersonIcon,
  DirectionsCar as VehicleIcon,
  AccessTime as TimeIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material'
import api from '../services/api'
import BusinessIdentity from '../components/BusinessIdentity'
import useBranding from '../hooks/useBranding'

const WorkOrderDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const { data, isLoading } = useQuery(
    'work-orders-display',
    async () => {
      const response = await api.get('/work-orders/display-board')
      return response.data
    },
    {
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    }
  )

  const brandingFromData = data?.branding
  const { data: fallbackBranding } = useBranding({ enabled: !brandingFromData })
  const branding = brandingFromData || fallbackBranding

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      normal: 'info',
      high: 'warning',
      urgent: 'error',
    }
    return colors[priority] || 'default'
  }

  const formatTime = (date) => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  const WorkOrderCard = ({ workOrder, column }) => (
    <Card 
      sx={{ 
        mb: 2, 
        borderLeft: `4px solid ${column === 'open' ? '#ed6c02' : '#0288d1'}`,
        '&:hover': { boxShadow: 4 }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {workOrder.work_order_number}
          </Typography>
          <Chip
            label={workOrder.priority.toUpperCase()}
            color={getPriorityColor(workOrder.priority)}
            size="small"
          />
        </Box>

        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
          {workOrder.title}
        </Typography>

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {workOrder.customer?.name || 'No Customer'}
          </Typography>
        </Box>

        {workOrder.key_tag_number && (
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Key Tag: {workOrder.key_tag_number}
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VehicleIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {workOrder.vehicle ? 
              `${workOrder.vehicle.year} ${workOrder.vehicle.make} ${workOrder.vehicle.model}` : 
              'No Vehicle'
            }
          </Typography>
        </Box>

        {workOrder.assigned_user && (
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Assigned: {workOrder.assigned_user.name}
            </Typography>
          </Box>
        )}

        {workOrder.due_date && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Due: {formatDate(workOrder.due_date)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f5f5f5',
      p: 3
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#1976d2', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BuildIcon sx={{ fontSize: 42 }} />
              <Box>
                <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
                  Service Department - Work Order Board
                </Typography>
                {branding && (
                  <BusinessIdentity
                    branding={branding}
                    title="Service Location"
                    dense
                    color="white"
                    showTaxId={false}
                    sx={{ mt: 0.5 }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Typography>
              <Typography variant="h6">
                {formatTime()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 3-Column Layout */}
        <Grid container spacing={3}>
          {/* Column 1: Pending Work Orders */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0', minHeight: '80vh' }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#ed6c02' }}>
                Pending Work Orders ({data?.open?.length || 0})
              </Typography>
              <Box sx={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
                {data?.open?.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                    No pending work orders
                  </Typography>
                ) : (
                  data?.open?.map((workOrder) => (
                    <WorkOrderCard key={workOrder.id} workOrder={workOrder} column="open" />
                  ))
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Column 2: In Progress Work Orders */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd', minHeight: '80vh' }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#0288d1' }}>
                In Progress ({data?.in_progress?.length || 0})
              </Typography>
              <Box sx={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
                {data?.in_progress?.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                    No work orders in progress
                  </Typography>
                ) : (
                  data?.in_progress?.map((workOrder) => (
                    <WorkOrderCard key={workOrder.id} workOrder={workOrder} column="in_progress" />
                  ))
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Column 3: Combined Info - Customer & Vehicle */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#f3e5f5', minHeight: '80vh' }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#7b1fa2' }}>
                Vehicle Details
              </Typography>
              <Box sx={{ overflowY: 'auto', maxHeight: 'calc(80vh - 80px)' }}>
                {[...(data?.open || []), ...(data?.in_progress || [])].length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                    No active work orders
                  </Typography>
                ) : (
                  [...(data?.open || []), ...(data?.in_progress || [])].map((workOrder) => (
                    <Card key={workOrder.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', color: '#7b1fa2', mb: 1 }}>
                          {workOrder.work_order_number}
                        </Typography>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Customer:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {workOrder.customer?.name || 'N/A'}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">Vehicle:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {workOrder.vehicle ? 
                              `${workOrder.vehicle.year} ${workOrder.vehicle.make} ${workOrder.vehicle.model}` : 
                              'N/A'
                            }
                          </Typography>
                          {workOrder.vehicle?.coach_number && (
                            <Typography variant="body2" color="text.secondary">
                              Coach #: {workOrder.vehicle.coach_number}
                            </Typography>
                          )}
                          {workOrder.vehicle?.license_plate && (
                            <Typography variant="body2" color="text.secondary">
                              Plate: {workOrder.vehicle.license_plate}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Auto-refresh indicator */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Auto-refreshing every 30 seconds
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default WorkOrderDisplay

