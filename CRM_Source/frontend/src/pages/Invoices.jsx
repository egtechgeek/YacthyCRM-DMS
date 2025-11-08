import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  TextField,
  Pagination,
} from '@mui/material'
import { Add as AddIcon, Visibility as ViewIcon, Email as EmailIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useAssetLabels } from '../context/AssetLabelContext'

const Invoices = () => {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('issue_date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const assetLabels = useAssetLabels()
  
  const isAdmin = user?.role === 'admin'

  const { data, isLoading, error } = useQuery(['invoices', statusFilter, searchQuery, sortBy, sortOrder, page], async () => {
    const params = {
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page,
    }
    const response = await api.get('/invoices', { params })
    return response.data
  })
  
  const handleSearch = () => {
    setSearchQuery(searchTerm)
    setPage(1) // Reset to page 1 when searching
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePageChange = (event, value) => {
    setPage(value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const deleteMutation = useMutation(
    (id) => api.delete(`/invoices/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices')
        alert('Invoice deleted successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to delete invoice')
      },
    }
  )

  const sendEmailMutation = useMutation(
    (id) => api.post(`/emails/send-invoice`, { invoice_id: id }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices')
        alert('Invoice email sent successfully')
      },
    }
  )

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'error',
      cancelled: 'default',
    }
    return colors[status] || 'default'
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading invoices</Alert></Container>

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Invoices</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/invoices/new')}
          >
            Add Invoice
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="sent">Sent</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="issue_date">Issue Date</MenuItem>
              <MenuItem value="invoice_number">Invoice #</MenuItem>
              <MenuItem value="due_date">Due Date</MenuItem>
              <MenuItem value="total">Total</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortOrder}
              label="Order"
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>{assetLabels.short}</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.customer?.name || '-'}</TableCell>
                <TableCell>
                  {invoice.vehicle
                    ? [invoice.vehicle.year, invoice.vehicle.make, invoice.vehicle.model].filter(Boolean).join(' ') || invoice.vehicle.name
                    : invoice.yacht?.name || '-'}
                </TableCell>
                <TableCell>
                  {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>${invoice.total?.toFixed(2)}</TableCell>
                <TableCell>
                  <Typography
                    color={invoice.balance > 0 ? 'error' : 'success'}
                    fontWeight="bold"
                  >
                    ${invoice.balance?.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={invoice.status} color={getStatusColor(invoice.status)} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/invoices/${invoice.id}`)} title="View">
                    <ViewIcon />
                  </IconButton>
                  {isAdmin && (
                    <IconButton size="small" onClick={() => navigate(`/invoices/${invoice.id}/edit`)} title="Edit (Admin)">
                      <EditIcon />
                    </IconButton>
                  )}
                  {invoice.status !== 'paid' && (
                    <IconButton
                      size="small"
                      onClick={() => sendEmailMutation.mutate(invoice.id)}
                      disabled={sendEmailMutation.isLoading}
                      title="Send Email"
                    >
                      <EmailIcon />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        if (window.confirm(`Delete invoice ${invoice.invoice_number}? This action cannot be undone.`)) {
                          deleteMutation.mutate(invoice.id)
                        }
                      }}
                      title="Delete (Admin)"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {data?.last_page > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={data.last_page}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Page Info */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {data?.from || 0} to {data?.to || 0} of {data?.total || 0} invoices
        </Typography>
      </Box>
    </Container>
  )
}

export default Invoices

