import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PlayArrow as GenerateIcon } from '@mui/icons-material'
import api from '../services/api'

const Maintenance = () => {
  const [open, setOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery('maintenance-schedules', async () => {
    const response = await api.get('/maintenance/schedules')
    return response.data
  })

  const deleteMutation = useMutation(
    (id) => api.delete(`/maintenance/schedules/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('maintenance-schedules')
      },
    }
  )

  const generateMutation = useMutation(
    (id) => api.post('/maintenance/generate-appointments', { schedule_id: id }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('maintenance-schedules')
        queryClient.invalidateQueries('appointments')
        alert('Appointments generated successfully')
      },
    }
  )

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance schedule?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading maintenance schedules</Alert></Container>

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Maintenance Schedules</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingSchedule(null)
            setOpen(true)
          }}
        >
          Add Schedule
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Yacht</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Next Due</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.yacht?.name || '-'}</TableCell>
                <TableCell>{schedule.task_description}</TableCell>
                <TableCell>{schedule.frequency}</TableCell>
                <TableCell>
                  {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={schedule.active ? 'Active' : 'Inactive'}
                    color={schedule.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => generateMutation.mutate(schedule.id)}
                    disabled={generateMutation.isLoading}
                    title="Generate Appointments"
                  >
                    <GenerateIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => {
                    setEditingSchedule(schedule)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(schedule.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <MaintenanceDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingSchedule(null)
        }}
        schedule={editingSchedule}
      />
    </Container>
  )
}

const MaintenanceDialog = ({ open, onClose, schedule }) => {
  const [formData, setFormData] = useState({
    yacht_id: '',
    task_description: '',
    frequency: 'monthly',
    frequency_value: '1',
    next_due_date: '',
    notes: '',
    active: true,
  })

  const queryClient = useQueryClient()

  const { data: yachts } = useQuery('yachts', async () => {
    const response = await api.get('/yachts')
    return response.data
  })

  const mutation = useMutation(
    (data) => {
      const submitData = {
        ...data,
        yacht_id: parseInt(data.yacht_id),
        frequency_value: parseInt(data.frequency_value) || 1,
        next_due_date: data.next_due_date ? new Date(data.next_due_date).toISOString() : null,
        active: data.active === true || data.active === 'true',
      }
      if (schedule) {
        return api.put(`/maintenance/schedules/${schedule.id}`, submitData)
      }
      return api.post('/maintenance/schedules', submitData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('maintenance-schedules')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (schedule) {
      setFormData({
        yacht_id: schedule.yacht_id || '',
        task_description: schedule.task_description || '',
        frequency: schedule.frequency || 'monthly',
        frequency_value: schedule.frequency_value || '1',
        next_due_date: schedule.next_due_date ? schedule.next_due_date.split('T')[0] : '',
        notes: schedule.notes || '',
        active: schedule.active !== false,
      })
    } else {
      setFormData({
        yacht_id: '',
        task_description: '',
        frequency: 'monthly',
        frequency_value: '1',
        next_due_date: '',
        notes: '',
        active: true,
      })
    }
  }, [schedule])

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{schedule ? 'Edit Maintenance Schedule' : 'Add Maintenance Schedule'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Yacht</InputLabel>
              <Select
                value={formData.yacht_id}
                label="Yacht"
                onChange={(e) => setFormData({ ...formData, yacht_id: e.target.value })}
              >
                {yachts?.data?.map((yacht) => (
                  <MenuItem key={yacht.id} value={yacht.id}>
                    {yacht.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Task Description"
              required
              multiline
              rows={2}
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={formData.frequency}
                    label="Frequency"
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Frequency Value"
                  type="number"
                  fullWidth
                  value={formData.frequency_value}
                  onChange={(e) => setFormData({ ...formData, frequency_value: e.target.value })}
                />
              </Grid>
            </Grid>
            <TextField
              label="Next Due Date"
              type="date"
              fullWidth
              value={formData.next_due_date}
              onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : schedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default Maintenance

