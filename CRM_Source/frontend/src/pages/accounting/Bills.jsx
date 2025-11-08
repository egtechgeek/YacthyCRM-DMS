import { useState } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Pagination,
  MenuItem,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Receipt as BillIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const Bills = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' means "All Status"
  const [page, setPage] = useState(1)

  const qbColors = {
    primary: '#2c5f2d',
    secondary: '#97ce4c',
    border: '#c8d7dc',
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ]

  const statusLabel = statusOptions.find(option => option.value === statusFilter)?.label ?? 'All Status'

  const { data: billsData, isLoading } = useQuery(
    ['bills', page, search, statusFilter],
    () => api.get('/accounting/bills', {
      params: {
        page,
        search: search || undefined,
        status: statusFilter || undefined,
        per_page: 15,
      }
    }).then(res => res.data),
    { keepPreviousData: true }
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success'
      case 'partial': return 'warning'
      case 'overdue': return 'error'
      default: return 'default'
    }
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <BillIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bills
          </Typography>
          <Typography variant="body2">
            Manage vendor bills and expenses
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search bills..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              sx={{ width: 160 }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  const option = statusOptions.find(item => item.value === selected)
                  return option ? option.label : 'All Status'
                },
              }}
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/accounting/bills/new')}
            sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
          >
            Enter Bill
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.border }}>
                <TableCell>Bill #</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Bill Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Amount Paid</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">Loading...</TableCell>
                </TableRow>
              ) : billsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">No bills found</TableCell>
                </TableRow>
              ) : (
                billsData?.data?.map((bill) => (
                  <TableRow key={bill.id} hover>
                    <TableCell>{bill.bill_number}</TableCell>
                    <TableCell>{bill.vendor?.vendor_name || '-'}</TableCell>
                    <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                    <TableCell align="right">${parseFloat(bill.total).toFixed(2)}</TableCell>
                    <TableCell align="right">${parseFloat(bill.amount_paid).toFixed(2)}</TableCell>
                    <TableCell align="right">${parseFloat(bill.balance).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={bill.status.toUpperCase()}
                        size="small"
                        color={getStatusColor(bill.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => navigate(`/accounting/bills/${bill.id}`)}>
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => navigate(`/accounting/bills/${bill.id}/edit`)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {billsData?.last_page > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={billsData.last_page}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Container>
  )
}

export default Bills

