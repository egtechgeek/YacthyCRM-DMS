import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'
import useBranding from '../hooks/useBranding'
import BusinessIdentity from '../components/BusinessIdentity'

const Reports = () => {
  const assetLabels = useAssetLabels()
  const { data: branding } = useBranding()
  const { data: invoices } = useQuery('invoices', async () => {
    const response = await api.get('/invoices')
    return response.data
  })

  const { data: customers } = useQuery('customers', async () => {
    const response = await api.get('/customers')
    return response.data
  })

  const { data: yachts } = useQuery('yachts', async () => {
    const response = await api.get('/yachts')
    return response.data
  }, { enabled: assetLabels.yachtEnabled })

  const { data: vehicles } = useQuery('vehicles', async () => {
    const response = await api.get('/vehicles')
    return response.data
  }, { enabled: assetLabels.dmsEnabled })

  const { data: parts } = useQuery('parts', async () => {
    const response = await api.get('/parts')
    return response.data
  })

  if (!invoices || !customers || !parts || (assetLabels.yachtEnabled && !yachts) || (assetLabels.dmsEnabled && !vehicles)) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  const totalRevenue = invoices?.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
  const paidRevenue = invoices?.data?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0
  const outstandingBalance = invoices?.data?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0
  const overdueInvoices = invoices?.data?.filter(inv => inv.status === 'overdue').length || 0
  const totalCustomers = customers?.data?.length || 0
  const totalAssets = (assetLabels.yachtEnabled ? (yachts?.data?.length || 0) : 0) + (assetLabels.dmsEnabled ? (vehicles?.data?.length || 0) : 0)
  const lowStockParts = parts?.data?.filter(p => p.stock_quantity <= (p.low_stock_threshold || 0)).length || 0

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3 }}>Reports & Analytics</Typography>
      {branding && (
        <BusinessIdentity branding={branding} title="Business Overview" dense sx={{ mb: 3 }} />
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4">
                ${totalRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Paid Revenue
              </Typography>
              <Typography variant="h4" color="success.main">
                ${paidRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Outstanding Balance
              </Typography>
              <Typography variant="h4" color="error.main">
                ${outstandingBalance.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Overdue Invoices
              </Typography>
              <Typography variant="h4" color="error.main">
                {overdueInvoices}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Customers
              </Typography>
              <Typography variant="h4">
                {totalCustomers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total {assetLabels.plural}
              </Typography>
              <Typography variant="h4">
                {totalAssets}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Low Stock Parts
              </Typography>
              <Typography variant="h4" color="warning.main">
                {lowStockParts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Reports

