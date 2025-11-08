import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Build as BuildIcon,
  Tv as DisplayIcon,
} from '@mui/icons-material'
import api from '../services/api'
import useBranding from '../hooks/useBranding'
import BusinessIdentity from '../components/BusinessIdentity'

const WorkOrders = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const { data: branding } = useBranding()

  const { data, isLoading } = useQuery(['work-orders', statusFilter, priorityFilter, searchTerm], async () => {
    let url = '/work-orders?'
    if (statusFilter !== 'all') url += `status=${statusFilter}&`
    if (priorityFilter !== 'all') url += `priority=${priorityFilter}&`
    if (searchTerm) url += `search=${searchTerm}&`
    
    const response = await api.get(url)
    return response.data
  })

  const getStatusColor = (status) => {
    const colors = {
      open: 'warning',
      in_progress: 'info',
      completed: 'success',
      on_hold: 'default',
      cancelled: 'error',
    }
    return colors[status] || 'default'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      normal: 'info',
      high: 'warning',
      urgent: 'error',
    }
    return colors[priority] || 'default'
  }

  const formatStatus = (status) => {
    if (status === 'open') {
      return 'Pending'
    }
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            <BuildIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 32 }} />
            Work Orders
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DisplayIcon />}
              onClick={() => navigate('/work-orders/display')}
            >
              Display Board
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/work-orders/new')}
            >
              New Work Order
            </Button>
          </Box>
        </Box>

        {branding && (
          <BusinessIdentity branding={branding} title="Service Department" dense sx={{ mb: 3 }} />
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="open">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>WO Number</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Key Tag</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No work orders found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((workOrder) => (
                  <TableRow key={workOrder.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {workOrder.work_order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{workOrder.title}</TableCell>
                    <TableCell>{workOrder.customer?.name || 'N/A'}</TableCell>
                    <TableCell>{workOrder.key_tag_number || '—'}</TableCell>
                    <TableCell>
                      {workOrder.vehicle ? 
                        `${workOrder.vehicle.year} ${workOrder.vehicle.make} ${workOrder.vehicle.model}` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatus(workOrder.status)}
                        color={getStatusColor(workOrder.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workOrder.priority.toUpperCase()}
                        color={getPriorityColor(workOrder.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{workOrder.assigned_user?.name || 'Unassigned'}</TableCell>
                    <TableCell>{workOrder.due_date || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/work-orders/${workOrder.id}`)}
                        title="View Details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/work-orders/${workOrder.id}/edit`)}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  )
}

export default WorkOrders

