import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material'
import { Visibility as ViewIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'
import { useAuth } from '../contexts/AuthContext'

const CustomerPortal = () => {
  const { user } = useAuth()
  const assetLabels = useAssetLabels()
  const navigate = useNavigate()

  const { data: customer } = useQuery(
    ['customer', user?.id],
    async () => {
      const response = await api.get('/customers')
      const customers = response.data.data || []
      return customers.find(c => c.email === user?.email) || null
    },
    { enabled: !!user }
  )

  const { data: invoices } = useQuery(
    ['customer-invoices'],
    async () => {
      const response = await api.get('/invoices')
      return response.data
    },
    { enabled: !!customer }
  )

  const { data: assets } = useQuery(
    ['customer-assets'],
    async () => {
      const response = await api.get('/customer/assets')
      return response.data?.data || []
    },
    { enabled: !!customer }
  )

  if (!customer) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  const customerInvoices = invoices?.data?.filter(inv => inv.customer_id === customer.id) || []
  const totalOutstanding = customerInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0)

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3 }}>Customer Portal</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Outstanding Balance
              </Typography>
              <Typography variant="h4" color={totalOutstanding > 0 ? 'error.main' : 'success.main'}>
                ${totalOutstanding.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Invoices
              </Typography>
              <Typography variant="h4">
                {customerInvoices.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {assetLabels.plural}
              </Typography>
              <Typography variant="h4">
                {assets?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>My {assetLabels.plural}</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{assetLabels.singular} Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Identifier</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets?.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.name || asset.display_name}</TableCell>
                  <TableCell>{asset.asset_type || '-'}</TableCell>
                  <TableCell>{asset.identifier || '-'}</TableCell>
                  <TableCell align="right">
                    {asset.link ? (
                      <Button size="small" onClick={() => navigate(asset.link)}>
                        View
                      </Button>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>My Invoices</Typography>
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
              {customerInvoices.map((invoice) => (
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
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  )
}

export default CustomerPortal

