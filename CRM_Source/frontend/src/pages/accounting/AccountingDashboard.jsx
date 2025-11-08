import { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  AccountBalance as BankIcon,
  Business as VendorsIcon,
  People as CustomersIcon,
  Work as EmployeesIcon,
  AttachMoney as MoneyIcon,
  Assessment as ReportsIcon,
  Description as InvoiceIcon,
  Receipt as BillIcon,
  Payment as PaymentIcon,
  AccountBalanceWallet as ExpenseIcon,
  TrendingUp,
  AccountTree as ChartIcon,
  Book as JournalIcon,
  CheckCircle as ReconcileIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const AccountingDashboard = () => {
  const navigate = useNavigate()

  // QuickBooks Desktop colors
  const qbColors = {
    primary: '#2c5f2d',
    secondary: '#97ce4c',
    lightBlue: '#e8f4f8',
    darkBlue: '#0077c8',
    border: '#c8d7dc',
  }

  const [startDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate] = useState(new Date().toISOString().split('T')[0])

  const { data: accountSummary, isLoading: summaryLoading, error: summaryError } = useQuery(
    ['accounting-summary', startDate, endDate],
    async () => {
      const response = await api.get('/accounting/summary', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      })

      return response.data
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  )

  const WorkflowButton = ({ icon, label, onClick, color = qbColors.lightBlue, iconColor = qbColors.darkBlue }) => (
    <Button
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        minHeight: 100,
        bgcolor: color,
        border: '2px solid',
        borderColor: qbColors.border,
        borderRadius: 1,
        '&:hover': {
          bgcolor: '#d0e8f0',
          borderColor: qbColors.darkBlue,
        },
        textTransform: 'none',
      }}
    >
      <Box sx={{ color: iconColor, mb: 1 }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: '#000', fontWeight: 500, textAlign: 'center' }}>
        {label}
      </Typography>
    </Button>
  )

  const WorkflowArrow = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}>
      <ArrowIcon sx={{ color: qbColors.darkBlue, fontSize: 32 }} />
    </Box>
  )

  return (
    <Container maxWidth="xl" sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header - QuickBooks Style */}
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: qbColors.primary, 
          color: '#fff',
          borderRadius: 0,
        }}>
          <Typography variant="h5" fontWeight="bold">
            Company Home
          </Typography>
          <Typography variant="body2">
            Accounting Dashboard
          </Typography>
        </Paper>

        {/* QuickBooks Desktop Style Layout */}
        <Grid container spacing={3}>
          {/* Left Sidebar - Company Snapshot */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, border: '1px solid', borderColor: qbColors.border }}>
              <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                Company Snapshot
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {summaryLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : summaryError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to load summary data. Please try again.
                </Alert>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Total Assets</Typography>
                    <Typography variant="h6" sx={{ color: qbColors.primary }}>
                      ${(accountSummary?.total_assets || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Total Liabilities</Typography>
                    <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                      ${(accountSummary?.total_liabilities || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Equity</Typography>
                    <Typography variant="h6">
                      ${(accountSummary?.total_equity || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Income (YTD)</Typography>
                    <Typography variant="h6" sx={{ color: qbColors.primary }}>
                      ${(accountSummary?.total_income || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Expenses (YTD)</Typography>
                    <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                      ${(accountSummary?.total_expenses || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Net Income</Typography>
                    <Typography variant="h6" sx={{ color: accountSummary?.net_income >= 0 ? qbColors.primary : '#d32f2f' }}>
                      ${(accountSummary?.net_income || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Bank Balance</Typography>
                    <Typography variant="h6" sx={{ color: qbColors.primary }}>
                      ${(accountSummary?.bank_balance || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Sales Tax Liability</Typography>
                    <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                      ${(accountSummary?.sales_tax_liability_balance || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </>
              )}

              <List dense>
                <ListItem button onClick={() => navigate('/accounting/chart-of-accounts')}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ChartIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Chart of Accounts" primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
                <ListItem button onClick={() => navigate('/accounting/journal-entries')}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <JournalIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Make Journal Entry" primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
                <ListItem button onClick={() => navigate('/accounting/reports')}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ReportsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Reports" primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Main Content - Workflow Icons */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 3, border: '1px solid', borderColor: qbColors.border }}>
              {/* Vendors Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                  Vendors
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<VendorsIcon fontSize="large" />}
                      label="Vendors"
                      onClick={() => navigate('/accounting/vendors')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<BillIcon fontSize="large" />}
                      label="Enter Bills"
                      onClick={() => navigate('/accounting/bills/new')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<PaymentIcon fontSize="large" />}
                      label="Pay Bills"
                      onClick={() => navigate('/accounting/bills')}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Customers Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                  Customers
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<CustomersIcon fontSize="large" />}
                      label="Customers"
                      onClick={() => navigate('/customers')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<InvoiceIcon fontSize="large" />}
                      label="Create Invoices"
                      onClick={() => navigate('/invoices/new')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<PaymentIcon fontSize="large" />}
                      label="Receive Payments"
                      onClick={() => navigate('/payments')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<BankIcon fontSize="large" />}
                      label="Bank Transactions"
                      onClick={() => navigate('/accounting/bank-transactions')}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Banking Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                  Banking
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<BankIcon fontSize="large" />}
                      label="Bank Accounts"
                      onClick={() => navigate('/accounting/bank-accounts')}
                    />
                  </Grid>
                  <Grid item xs="auto" sx={{ display: { xs: 'none', md: 'block' } }}>
                    <WorkflowArrow />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.5}>
                    <WorkflowButton
                      icon={<ReconcileIcon fontSize="large" />}
                      label="Reconcile"
                      onClick={() => navigate('/accounting/reconciliation')}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Company Section */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                  Company
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <WorkflowButton
                      icon={<ChartIcon fontSize="large" />}
                      label="Chart of Accounts"
                      onClick={() => navigate('/accounting/chart-of-accounts')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <WorkflowButton
                      icon={<JournalIcon fontSize="large" />}
                      label="Make Journal Entry"
                      onClick={() => navigate('/accounting/journal-entries')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <WorkflowButton
                      icon={<ReportsIcon fontSize="large" />}
                      label="Reports & Graphs"
                      onClick={() => navigate('/accounting/reports')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <WorkflowButton
                      icon={<MoneyIcon fontSize="large" />}
                      label="QuickBooks Import"
                      onClick={() => navigate('/accounting/import')}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            {/* Reminders Section - QB Style */}
            <Paper sx={{ p: 2, mt: 3, border: '1px solid', borderColor: qbColors.border }}>
              <Typography variant="h6" gutterBottom sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
                Reminders
              </Typography>
              <Alert severity="info" sx={{ mb: 1 }}>
                Welcome to the Accounting Module!
              </Alert>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Set up your Chart of Accounts"
                    secondary="Click 'Chart of Accounts' above to begin"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Import from QuickBooks"
                    secondary="Use 'QuickBooks Import' to bring in your existing data"
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Stats Cards - Below Main Content */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: qbColors.border }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BankIcon sx={{ mr: 1, color: qbColors.darkBlue }} />
                  <Typography variant="subtitle2">Bank Accounts</Typography>
                </Box>
                <Typography variant="h5" sx={{ color: qbColors.primary }}>
                  ${(accountSummary?.bank_balance || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total in all bank accounts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: qbColors.border }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle2">Income (YTD)</Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#2e7d32' }}>
                  ${(accountSummary?.total_income || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Year to date
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: qbColors.border }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ExpenseIcon sx={{ mr: 1, color: '#d32f2f' }} />
                  <Typography variant="subtitle2">Expenses (YTD)</Typography>
                </Box>
                <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                  ${(accountSummary?.total_expenses || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Year to date
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: '1px solid', borderColor: qbColors.border }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: qbColors.darkBlue }} />
                  <Typography variant="subtitle2">Net Income</Typography>
                </Box>
                <Typography variant="h5" sx={{ color: qbColors.darkBlue }}>
                  ${(accountSummary?.net_income || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Year to date
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Account Balances Section */}
        <Paper sx={{ p: 2, mt: 3, border: '1px solid', borderColor: qbColors.border }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: qbColors.primary, fontWeight: 'bold' }}>
              Account Balances
            </Typography>
            <Button 
              size="small"
              onClick={() => navigate('/accounting/chart-of-accounts')}
              sx={{ color: qbColors.darkBlue }}
            >
              View All Accounts
            </Button>
          </Box>
          <Alert severity="info">
            Set up your Chart of Accounts to see account balances here.
          </Alert>
        </Paper>
      </Box>
    </Container>
  )
}

export default AccountingDashboard

