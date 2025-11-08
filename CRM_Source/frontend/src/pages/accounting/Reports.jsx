import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material'
import {
  Assessment as ReportIcon,
  TrendingUp,
  AccountBalance,
  DateRange,
  Receipt,
  Payment,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  AccountBalance as TaxIcon,
} from '@mui/icons-material'
import api from '../../services/api'
import useBranding from '../../hooks/useBranding'
import BusinessIdentity from '../../components/BusinessIdentity'

const Reports = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedReport, setSelectedReport] = useState(null)
  const { data: branding } = useBranding()

  const qbColors = {
    primary: '#2c5f2d',
    border: '#c8d7dc',
  }

  const { data: profitLoss } = useQuery(
    ['profit-loss', startDate, endDate],
    () => api.get('/accounting/reports/profit-loss', { params: { start_date: startDate, end_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'profit-loss' }
  )

  const { data: balanceSheet } = useQuery(
    ['balance-sheet', endDate],
    () => api.get('/accounting/reports/balance-sheet', { params: { as_of_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'balance-sheet' }
  )

  const { data: trialBalance } = useQuery(
    ['trial-balance', endDate],
    () => api.get('/accounting/reports/trial-balance', { params: { as_of_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'trial-balance' }
  )

  const { data: arAging } = useQuery(
    ['ar-aging', endDate],
    () => api.get('/accounting/reports/ar-aging', { params: { as_of_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'ar-aging' }
  )

  const { data: apAging } = useQuery(
    ['ap-aging', endDate],
    () => api.get('/accounting/reports/ap-aging', { params: { as_of_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'ap-aging' }
  )

  const { data: taxSummary } = useQuery(
    ['tax-summary', startDate, endDate],
    () => api.get('/accounting/reports/tax-summary', { params: { start_date: startDate, end_date: endDate } }).then(res => res.data),
    { enabled: selectedReport === 'tax-summary' }
  )

  const reports = [
    { id: 'profit-loss', name: 'Profit & Loss', icon: TrendingUp, description: 'Income and expenses over a period' },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: AccountBalance, description: 'Assets, liabilities, and equity' },
    { id: 'trial-balance', name: 'Trial Balance', icon: DateRange, description: 'All account balances' },
    { id: 'ar-aging', name: 'A/R Aging', icon: Receipt, description: 'Accounts receivable aging report' },
    { id: 'ap-aging', name: 'A/P Aging', icon: Payment, description: 'Accounts payable aging report' },
    { id: 'tax-summary', name: 'Tax Summary', icon: TaxIcon, description: 'Sales and purchase tax totals' },
  ]

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Simple PDF generation using browser print-to-PDF
    const originalTitle = document.title
    document.title = `${reports.find(r => r.id === selectedReport)?.name || 'Report'} - ${new Date().toLocaleDateString()}`
    window.print()
    document.title = originalTitle
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Accounting Reports
          </Typography>
          <Typography variant="body2">
            Financial reports and analysis
          </Typography>
          {branding && (
            <BusinessIdentity branding={branding} title="Issued By" dense color="#fff" showTaxId={false} sx={{ mt: 2 }} />
          )}
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
        </Box>

        <Grid container spacing={3}>
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <Grid item xs={12} sm={6} md={4} key={report.id}>
                <Card sx={{ height: '100%', border: selectedReport === report.id ? `2px solid ${qbColors.primary}` : '1px solid #e0e0e0' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Icon sx={{ mr: 1, color: qbColors.primary }} />
                      <Typography variant="h6">{report.name}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {report.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant={selectedReport === report.id ? 'contained' : 'outlined'}
                      onClick={() => setSelectedReport(report.id)}
                      sx={{
                        bgcolor: selectedReport === report.id ? qbColors.primary : 'transparent',
                        color: selectedReport === report.id ? '#fff' : qbColors.primary,
                        '&:hover': { bgcolor: selectedReport === report.id ? '#1e4620' : 'transparent' }
                      }}
                    >
                      View Report
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {selectedReport === 'profit-loss' && profitLoss && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Profit & Loss - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ mr: 1 }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Income</Typography>
              <Box sx={{ pl: 2, mt: 1 }}>
                {profitLoss.income?.map((item) => (
                  <Box key={item.account_number} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography>{item.account_name}</Typography>
                    <Typography>${parseFloat(item.amount).toFixed(2)}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, fontWeight: 'bold' }}>
                  <Typography>Total Income</Typography>
                  <Typography>${parseFloat(profitLoss.total_income).toFixed(2)}</Typography>
                </Box>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: qbColors.primary, mt: 3 }}>Expenses</Typography>
              <Box sx={{ pl: 2, mt: 1 }}>
                {profitLoss.expenses?.map((item) => (
                  <Box key={item.account_number} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography>{item.account_name}</Typography>
                    <Typography>${parseFloat(item.amount).toFixed(2)}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, fontWeight: 'bold' }}>
                  <Typography>Total Expenses</Typography>
                  <Typography>${parseFloat(profitLoss.total_expenses).toFixed(2)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, mt: 2, borderTop: 2, fontWeight: 'bold', fontSize: '1.2em' }}>
                <Typography>Net Income</Typography>
                <Typography sx={{ color: profitLoss.net_income >= 0 ? 'green' : 'red' }}>
                  ${parseFloat(profitLoss.net_income).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {selectedReport === 'balance-sheet' && balanceSheet && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Balance Sheet - As of {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 1 }}>
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Assets</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableBody>
                    {(balanceSheet.assets || []).map((asset) => (
                      <TableRow key={asset.account_number || asset.account_name}>
                        <TableCell>{asset.account_name}</TableCell>
                        <TableCell align="right">${parseFloat(asset.amount || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ fontWeight: 'bold', borderTop: 1 }}>
                      <TableCell>Total Assets</TableCell>
                      <TableCell align="right">${parseFloat(balanceSheet.total_assets || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Liabilities</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableBody>
                    {(balanceSheet.liabilities || []).map((liability) => (
                      <TableRow key={liability.account_number || liability.account_name}>
                        <TableCell>{liability.account_name}</TableCell>
                        <TableCell align="right">${parseFloat(liability.amount || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ fontWeight: 'bold', borderTop: 1 }}>
                      <TableCell>Total Liabilities</TableCell>
                      <TableCell align="right">${parseFloat(balanceSheet.total_liabilities || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Equity</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableBody>
                    {(balanceSheet.equity || []).map((eq) => (
                      <TableRow key={eq.account_number || eq.account_name}>
                        <TableCell>{eq.account_name}</TableCell>
                        <TableCell align="right">${parseFloat(eq.amount || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ fontWeight: 'bold', borderTop: 1 }}>
                      <TableCell>Total Equity</TableCell>
                      <TableCell align="right">${parseFloat(balanceSheet.total_equity || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                      <TableCell>Liabilities + Equity</TableCell>
                      <TableCell align="right">${parseFloat(balanceSheet.liabilities_and_equity || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Paper>
        )}

        {selectedReport === 'trial-balance' && trialBalance && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Trial Balance - As of {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ mr: 1 }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: qbColors.border }}>
                    <TableCell>Account #</TableCell>
                    <TableCell>Account Name</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trialBalance.accounts?.map((account) => (
                    <TableRow key={account.account_number}>
                      <TableCell>{account.account_number}</TableCell>
                      <TableCell>{account.account_name}</TableCell>
                      <TableCell align="right">
                        {account.debit > 0 ? `$${parseFloat(account.debit).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {account.credit > 0 ? `$${parseFloat(account.credit).toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell align="right">${parseFloat(trialBalance.total_debits).toFixed(2)}</TableCell>
                    <TableCell align="right">${parseFloat(trialBalance.total_credits).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {selectedReport === 'ar-aging' && arAging && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Accounts Receivable Aging - As of {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 1 }}>
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Current</Typography>
                <Typography variant="h6">${parseFloat(arAging.summary?.['current'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">1-30</Typography>
                <Typography variant="h6">${parseFloat(arAging.summary?.['1-30'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">31-60</Typography>
                <Typography variant="h6">${parseFloat(arAging.summary?.['31-60'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">61-90</Typography>
                <Typography variant="h6">${parseFloat(arAging.summary?.['61-90'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">90+</Typography>
                <Typography variant="h6">${parseFloat(arAging.summary?.['90+'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Total Receivable</Typography>
                <Typography variant="h5">${parseFloat(arAging.total_receivable || 0).toLocaleString()}</Typography>
              </Grid>
            </Grid>

            <TableContainer sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: qbColors.border }}>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Invoice Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Days Overdue</TableCell>
                    <TableCell>Aging</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(arAging.invoices || []).map((invoice) => (
                    <TableRow key={invoice.invoice_number}>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell align="right">${parseFloat(invoice.balance || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{invoice.days_overdue}</TableCell>
                      <TableCell>{invoice.aging_period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {selectedReport === 'ap-aging' && apAging && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Accounts Payable Aging - As of {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button startIcon={<PrintIcon />} onClick={handlePrint} sx={{ mr: 1 }}>
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Current</Typography>
                <Typography variant="h6">${parseFloat(apAging.summary?.['current'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">1-30</Typography>
                <Typography variant="h6">${parseFloat(apAging.summary?.['1-30'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">31-60</Typography>
                <Typography variant="h6">${parseFloat(apAging.summary?.['31-60'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">61-90</Typography>
                <Typography variant="h6">${parseFloat(apAging.summary?.['61-90'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">90+</Typography>
                <Typography variant="h6">${parseFloat(apAging.summary?.['90+'] || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Total Payable</Typography>
                <Typography variant="h5">${parseFloat(apAging.total_payable || 0).toLocaleString()}</Typography>
              </Grid>
            </Grid>

            <TableContainer sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: qbColors.border }}>
                    <TableCell>Bill #</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Bill Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Days Overdue</TableCell>
                    <TableCell>Aging</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(apAging.bills || []).map((bill) => (
                    <TableRow key={bill.bill_number}>
                      <TableCell>{bill.bill_number}</TableCell>
                      <TableCell>{bill.vendor_name}</TableCell>
                      <TableCell>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell align="right">${parseFloat(bill.balance || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{bill.days_overdue}</TableCell>
                      <TableCell>{bill.aging_period}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {selectedReport === 'tax-summary' && taxSummary && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Tax Summary - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </Typography>
              <Box>
                <Button
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ mr: 1 }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={handleDownloadPDF}
                  sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
                >
                  Download PDF
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Sales Tax Total</Typography>
                <Typography variant="h5" sx={{ color: qbColors.primary }}>
                  ${(taxSummary.sales_tax_total || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Collected + Pending</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Sales Tax Collected</Typography>
                <Typography variant="h5" sx={{ color: '#2e7d32' }}>
                  ${(taxSummary.sales_tax_collected || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">From paid invoices</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Sales Tax Pending</Typography>
                <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                  ${(taxSummary.sales_tax_pending || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Outstanding invoices</Typography>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Purchase Tax Total</Typography>
                <Typography variant="h5" sx={{ color: qbColors.primary }}>
                  ${(taxSummary.purchase_tax_total || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">From vendor bills</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Purchase Tax Paid</Typography>
                <Typography variant="h5" sx={{ color: '#2e7d32' }}>
                  ${(taxSummary.purchase_tax_paid || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Bills paid or partial</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Purchase Tax Outstanding</Typography>
                <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                  ${(taxSummary.purchase_tax_outstanding || 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">Remaining on open bills</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Taxable Sales</Typography>
                <Typography variant="h6">${(taxSummary.taxable_sales || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Gross Sales</Typography>
                <Typography variant="h6">${(taxSummary.gross_sales || 0).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">Net Tax Liability</Typography>
                <Typography variant="h6" sx={{ color: taxSummary.net_tax_liability >= 0 ? '#d32f2f' : '#2e7d32' }}>
                  ${(taxSummary.net_tax_liability || 0).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Invoice Breakdown</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell>Invoices</TableCell>
                      <TableCell align="right">{taxSummary.invoice_count || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sales Tax Collected</TableCell>
                      <TableCell align="right">${(taxSummary.sales_tax_collected || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sales Tax Pending</TableCell>
                      <TableCell align="right">${(taxSummary.sales_tax_pending || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary }}>Bill Breakdown</Typography>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell>Bills</TableCell>
                      <TableCell align="right">{taxSummary.bill_count || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Purchase Tax Paid</TableCell>
                      <TableCell align="right">${(taxSummary.purchase_tax_paid || 0).toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Purchase Tax Outstanding</TableCell>
                      <TableCell align="right">${(taxSummary.purchase_tax_outstanding || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Grid>
            </Grid>

            {taxSummary.invoice_tax_breakdown?.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary, mb: 1 }}>
                  Invoice Tax Breakdown
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: qbColors.border }}>
                        <TableCell>Tax Name</TableCell>
                        <TableCell align="right">Invoices</TableCell>
                        <TableCell align="right">Taxable Sales</TableCell>
                        <TableCell align="right">Tax Amount</TableCell>
                        <TableCell align="right">Average Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {taxSummary.invoice_tax_breakdown.map((row) => (
                        <TableRow key={row.tax_name}>
                          <TableCell>{row.tax_name}</TableCell>
                          <TableCell align="right">{row.invoice_count}</TableCell>
                          <TableCell align="right">${(row.taxable_sales || 0).toLocaleString()}</TableCell>
                          <TableCell align="right">${(row.tax_amount || 0).toLocaleString()}</TableCell>
                          <TableCell align="right">{row.average_rate ? `${row.average_rate.toFixed(2)}%` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {taxSummary.bill_tax_breakdown?.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary, mb: 1 }}>
                  Bill Tax Breakdown
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: qbColors.border }}>
                        <TableCell>Tax Name</TableCell>
                        <TableCell align="right">Bills</TableCell>
                        <TableCell align="right">Taxable Purchases</TableCell>
                        <TableCell align="right">Tax Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {taxSummary.bill_tax_breakdown.map((row) => (
                        <TableRow key={row.tax_name}>
                          <TableCell>{row.tax_name}</TableCell>
                          <TableCell align="right">{row.bill_count}</TableCell>
                          <TableCell align="right">${(row.taxable_purchases || 0).toLocaleString()}</TableCell>
                          <TableCell align="right">${(row.tax_amount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {taxSummary.tax_accounts?.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: qbColors.primary, mb: 1 }}>
                  Tax Liability Accounts
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: qbColors.border }}>
                        <TableCell>Account #</TableCell>
                        <TableCell>Account Name</TableCell>
                        <TableCell>Detail Type</TableCell>
                        <TableCell align="right">Current Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {taxSummary.tax_accounts.map((account) => (
                        <TableRow key={account.account_number || account.account_name}>
                          <TableCell>{account.account_number || '-'}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell>{account.detail_type}</TableCell>
                          <TableCell align="right">${(account.current_balance || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  )
}

export default Reports

