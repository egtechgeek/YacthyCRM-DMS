import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
  Pagination,
} from '@mui/material'
import Chip from '@mui/material/Chip'
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CheckCircle as PostIcon,
  Cancel as VoidIcon,
  Book as JournalIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const JournalEntries = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')

  // QuickBooks colors
  const qbColors = {
    primary: '#2c5f2d',
    headerBg: '#e8f4f8',
    border: '#c8d7dc',
  }

  const { data, isLoading, error } = useQuery(
    ['journal-entries', page, statusFilter],
    async () => {
      const params = {
        page,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }
      const response = await api.get('/accounting/journal-entries', { params })
      return response.data
    }
  )

  const deleteMutation = useMutation(
    (id) => api.delete(`/accounting/journal-entries/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('journal-entries')
      },
    }
  )

  const postMutation = useMutation(
    (id) => api.post(`/accounting/journal-entries/${id}/post`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('journal-entries')
        alert('Journal entry posted successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to post entry')
      },
    }
  )

  const voidMutation = useMutation(
    (id) => api.post(`/accounting/journal-entries/${id}/void`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('journal-entries')
        alert('Journal entry voided')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Delete this draft entry?')) {
      deleteMutation.mutate(id)
    }
  }

  const handlePost = (id) => {
    if (window.confirm('Post this entry? It cannot be edited after posting.')) {
      postMutation.mutate(id)
    }
  }

  const handleVoid = (id) => {
    if (window.confirm('Void this entry?')) {
      voidMutation.mutate(id)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'posted': return 'success'
      case 'void': return 'error'
      default: return 'warning'
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Typography color="error">Error loading journal entries</Typography></Container>

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* QuickBooks-style Header */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                <JournalIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Make General Journal Entries
              </Typography>
              <Typography variant="body2">
                Record adjustments and other transactions
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{ bgcolor: '#fff', color: qbColors.primary, '&:hover': { bgcolor: '#f0f0f0' } }}
              startIcon={<AddIcon />}
              onClick={() => navigate('/accounting/journal-entries/new')}
            >
              New Journal Entry
            </Button>
          </Box>
        </Paper>

        {/* Journal Entries List */}
        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: qbColors.border }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: qbColors.headerBg }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Entry #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Debit</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Credit</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.map((entry) => (
                <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{entry.entry_number}</TableCell>
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.description || '-'}</TableCell>
                  <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    ${parseFloat(entry.total_debits || 0).toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    ${parseFloat(entry.total_credits || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status.toUpperCase()}
                      color={getStatusColor(entry.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/accounting/journal-entries/${entry.id}`)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    {entry.status === 'draft' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handlePost(entry.id)}
                          title="Post Entry"
                        >
                          <PostIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    {entry.status === 'posted' && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleVoid(entry.id)}
                        title="Void Entry"
                      >
                        <VoidIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.total > data.per_page && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={data.last_page}
              page={data.current_page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/accounting')}>
            Back to Accounting Home
          </Button>
        </Box>
      </Box>
    </Container>
  )
}

export default JournalEntries

