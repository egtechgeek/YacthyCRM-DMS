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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Grid,
} from '@mui/material'
import {
  BeachAccess as TimeOffIcon,
  Add as AddIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const TimeOffRequests = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    type: 'vacation',
    notes: '',
  })
  const [reviewData, setReviewData] = useState({
    status: 'approved',
    review_notes: '',
  })

  const isAdmin = ['admin', 'office_staff'].includes(user?.role)

  const { data, isLoading, error } = useQuery(
    ['time-off-requests', statusFilter, page],
    async () => {
      const params = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        page,
      }
      const response = await api.get('/timeclock/time-off', { params })
      return response.data
    }
  )

  const createMutation = useMutation(
    (data) => api.post('/timeclock/time-off', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('time-off-requests')
        setDialogOpen(false)
        setFormData({ start_date: '', end_date: '', type: 'vacation', notes: '' })
        alert('Time off request submitted successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to submit request')
      },
    }
  )

  const reviewMutation = useMutation(
    ({ id, status, review_notes }) => api.post(`/timeclock/time-off/${id}/review`, { status, review_notes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('time-off-requests')
        setReviewDialogOpen(false)
        setSelectedRequest(null)
        alert('Request reviewed successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to review request')
      },
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleReview = () => {
    reviewMutation.mutate({
      id: selectedRequest.id,
      status: reviewData.status,
      review_notes: reviewData.review_notes,
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      default:
        return 'warning'
    }
  }

  const getTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  if (isLoading) {
    return <Container><Typography>Loading...</Typography></Container>
  }

  if (error) {
    return <Container><Alert severity="error">Error loading time off requests</Alert></Container>
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              <TimeOffIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Time Off Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Request and manage time off
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Request
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Requests Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isAdmin && <TableCell>Employee</TableCell>}
                <TableCell>Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.map((request) => (
                <TableRow key={request.id}>
                  {isAdmin && <TableCell>{request.user?.name}</TableCell>}
                  <TableCell>
                    <Chip label={getTypeLabel(request.type)} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(request.start_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(request.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{request.total_days} day(s)</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{request.notes || '-'}</TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      {request.status === 'pending' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedRequest(request)
                            setReviewDialogOpen(true)
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {data && data.total > data.per_page && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Page {data.current_page} of {data.last_page} ({data.total} total requests)
            </Typography>
            <Pagination
              count={data.last_page}
              page={data.current_page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}

        {/* Create Request Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <MenuItem value="vacation">Vacation</MenuItem>
                    <MenuItem value="sick">Sick Leave</MenuItem>
                    <MenuItem value="personal">Personal Day</MenuItem>
                    <MenuItem value="unpaid">Unpaid Leave</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />

                <TextField
                  fullWidth
                  type="date"
                  label="End Date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />

                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional: Reason for time off..."
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={createMutation.isLoading}>
                {createMutation.isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Time Off Request</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>{selectedRequest.user?.name}</strong> requesting {selectedRequest.total_days} day(s) off
                </Alert>

                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Type:</strong> {getTypeLabel(selectedRequest.type)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Dates:</strong> {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </Typography>
                  {selectedRequest.notes && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Notes:</strong> {selectedRequest.notes}
                    </Typography>
                  )}
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Decision</InputLabel>
                  <Select
                    value={reviewData.status}
                    label="Decision"
                    onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                  >
                    <MenuItem value="approved">Approve</MenuItem>
                    <MenuItem value="rejected">Reject</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Review Notes (optional)"
                  multiline
                  rows={3}
                  value={reviewData.review_notes}
                  onChange={(e) => setReviewData({ ...reviewData, review_notes: e.target.value })}
                  placeholder="Optional: Add notes about your decision..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleReview}
              disabled={reviewMutation.isLoading}
              color={reviewData.status === 'approved' ? 'success' : 'error'}
            >
              {reviewMutation.isLoading ? 'Submitting...' : reviewData.status === 'approved' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  )
}

export default TimeOffRequests

