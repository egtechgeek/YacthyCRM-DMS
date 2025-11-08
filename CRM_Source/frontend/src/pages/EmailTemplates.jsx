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
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Edit as EditIcon } from '@mui/icons-material'
import api from '../services/api'

const EmailTemplates = () => {
  const [open, setOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery('email-templates', async () => {
    const response = await api.get('/email-templates')
    return response.data
  })

  if (isLoading) return <Container><Typography>Loading...</Typography></Container>
  if (error) return <Container><Alert severity="error">Error loading email templates</Alert></Container>

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Email Templates</Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.type}</TableCell>
                <TableCell>{template.subject}</TableCell>
                <TableCell>{template.active ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => {
                    setEditingTemplate(template)
                    setOpen(true)
                  }}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TemplateDialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingTemplate(null)
        }}
        template={editingTemplate}
      />
    </Container>
  )
}

const TemplateDialog = ({ open, onClose, template }) => {
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    active: true,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation(
    (data) => api.put(`/email-templates/${template.id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('email-templates')
        onClose()
      },
    }
  )

  useEffect(() => {
    if (template) {
      setFormData({
        subject: template.subject || '',
        body: template.body || '',
        active: template.active !== false,
      })
    }
  }, [template])

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Email Template: {template?.type}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Subject"
              required
              fullWidth
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <TextField
              label="Body"
              required
              multiline
              rows={10}
              fullWidth
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              helperText="Use placeholders like {{customer_name}}, {{invoice_number}}, etc."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Saving...' : 'Update'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default EmailTemplates

