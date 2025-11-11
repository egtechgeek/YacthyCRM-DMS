import { Container, Typography, Box, Paper, Grid, CircularProgress } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from 'react-query'
import api from '../services/api'
import useCachedBranding from '../hooks/useCachedBranding'

const Dashboard = () => {
  const { user } = useAuth()
  const { branding, isLoading: brandingLoading } = useCachedBranding()

  const { data: stats, isLoading } = useQuery('dashboard-stats', async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  })

  const canViewStats = user?.role === 'admin' || user?.role === 'office_staff'

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  const statCards = [
    { label: 'Total Customers', value: stats?.customers || 0, color: '#1976d2' },
    { label: 'Total Vehicles', value: stats?.vehicles || stats?.yachts || 0, color: '#0288d1' },
    { label: 'Pending Work Orders', value: stats?.open_work_orders || 0, color: '#ed6c02' },
    { label: 'In Progress Work Orders', value: stats?.in_progress_work_orders || 0, color: '#0288d1' },
    { label: 'Active Invoices', value: stats?.active_invoices || 0, color: '#f57c00' },
    { label: 'Overdue Invoices', value: stats?.overdue_invoices || 0, color: '#d32f2f' },
    { label: 'Total Revenue (YTD)', value: `$${(stats?.total_revenue || 0).toLocaleString()}`, color: '#388e3c' },
    { label: 'Pending Quotes', value: stats?.pending_quotes || 0, color: '#7b1fa2' },
  ]

  const brandingName =
    branding?.crm_name?.trim() ||
    branding?.business_name?.trim() ||
    'YachtCRM'

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Welcome, {user?.name}!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {brandingLoading ? 'Loading branding…' : brandingName}
        </Typography>

        {canViewStats && (
          <Grid container spacing={3}>
            {statCards.map((stat, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 140,
                    borderLeft: `4px solid ${stat.color}`,
                  }}
                >
                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    {stat.label}
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ mt: 'auto', color: stat.color }}>
                    {stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  )
}

export default Dashboard

