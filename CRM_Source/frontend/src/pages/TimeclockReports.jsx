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
  TextField,
  IconButton,
  Pagination,
  Grid,
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  FileDownload as DownloadIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const TimeclockReports = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const isAdmin = ['admin', 'office_staff'].includes(user?.role)

  const { data: users } = useQuery('all-users-simple', async () => {
    if (!isAdmin) return null
    const response = await api.get('/users?per_page=1000')
    return response.data
  }, {
    enabled: isAdmin
  })

  const { data, isLoading, error } = useQuery(
    ['time-entries', page, statusFilter, userFilter, startDate, endDate],
    async () => {
      const params = {
        page,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(userFilter !== 'all' && { user_id: userFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      }
      const response = await api.get('/timeclock/entries', { params })
      return response.data
    }
  )

  const approveMutation = useMutation(
    ({ id, status }) => api.post(`/timeclock/entries/${id}/approve`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('time-entries')
        alert('Time entry updated successfully')
      },
      onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update entry')
      },
    }
  )

  const handleApprove = (id, status) => {
    const action = status === 'approved' ? 'approve' : 'reject'
    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this time entry?`)) {
      approveMutation.mutate({ id, status })
    }
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      ...(userFilter !== 'all' && { user_id: userFilter }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    })
    window.open(`/backend/api/timeclock/export/csv?${params}`, '_blank')
  }

  const handleExportPDF = () => {
    const params = new URLSearchParams({
      ...(userFilter !== 'all' && { user_id: userFilter }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
    })
    window.open(`/backend/api/timeclock/export/pdf?${params}`, '_blank')
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

  if (isLoading) {
    return <Container><Typography>Loading...</Typography></Container>
  }

  if (error) {
    return <Container><Alert severity="error">Error loading time entries</Alert></Container>
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              <ReportsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Timeclock Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage time entries
            </Typography>
          </Box>
          
          {isAdmin && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CsvIcon />}
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
            </Box>
          )}
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            {isAdmin && (
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={userFilter}
                    label="Employee"
                    onChange={(e) => setUserFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Employees</MenuItem>
                    {users?.data?.map((u) => (
                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} sm={6} md={2}>
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

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Time Entries Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {isAdmin && <TableCell>Employee</TableCell>}
                <TableCell>Date</TableCell>
                <TableCell>Clock In</TableCell>
                <TableCell>Clock Out</TableCell>
                <TableCell>Break</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.map((entry) => (
                <TableRow key={entry.id}>
                  {isAdmin && <TableCell>{entry.user?.name}</TableCell>}
                  <TableCell>
                    {new Date(entry.clock_in).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(entry.clock_in).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'Still clocked in'}
                  </TableCell>
                  <TableCell>{entry.break_minutes} min</TableCell>
                  <TableCell>
                    {entry.total_hours ? `${entry.total_hours} hrs` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      color={getStatusColor(entry.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{entry.notes || '-'}</TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      {entry.status === 'pending' && entry.clock_out && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(entry.id, 'approved')}
                            title="Approve"
                          >
                            <ApproveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleApprove(entry.id, 'rejected')}
                            title="Reject"
                          >
                            <RejectIcon />
                          </IconButton>
                        </>
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
              Page {data.current_page} of {data.last_page} ({data.total} total entries)
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
      </Box>
    </Container>
  )
}

export default TimeclockReports

