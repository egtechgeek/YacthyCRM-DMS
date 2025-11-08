import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Autocomplete,
  Grid,
  Alert,
  Chip,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as PostIcon,
} from '@mui/icons-material'
import api from '../../services/api'

const JournalEntryForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  // QuickBooks colors
  const qbColors = {
    primary: '#2c5f2d',
    headerBg: '#e8f4f8',
    border: '#c8d7dc',
    lightGreen: '#e8f5e9',
  }

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    memo: '',
  })

  const [lines, setLines] = useState([
    { account_id: '', account: null, debit: '', credit: '', description: '', reference: '' },
    { account_id: '', account: null, debit: '', credit: '', description: '', reference: '' },
  ])

  const { data: accounts } = useQuery('chart-of-accounts-simple', async () => {
    const response = await api.get('/accounting/chart-of-accounts')
    return response.data.accounts
  })

  const saveMutation = useMutation(
    (data) => {
      if (isEdit) {
        return api.put(`/accounting/journal-entries/${id}`, data)
      }
      return api.post('/accounting/journal-entries', data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('journal-entries')
        navigate('/accounting/journal-entries')
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to save journal entry'
        const details = error.response?.data
        if (details?.total_debits && details?.total_credits) {
          alert(`${message}\nDebits: $${details.total_debits}\nCredits: $${details.total_credits}\nDifference: $${Math.abs(details.difference)}`)
        } else {
          alert(message)
        }
      },
    }
  )

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', account: null, debit: '', credit: '', description: '', reference: '' }])
  }

  const handleRemoveLine = (index) => {
    if (lines.length > 2) {
      const newLines = lines.filter((_, i) => i !== index)
      setLines(newLines)
    }
  }

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines]
    newLines[index][field] = value
    
    // Auto-clear opposite field when entering debit or credit
    if (field === 'debit' && value) {
      newLines[index]['credit'] = ''
    } else if (field === 'credit' && value) {
      newLines[index]['debit'] = ''
    }
    
    setLines(newLines)
  }

  const handleAccountChange = (index, account) => {
    const newLines = [...lines]
    newLines[index]['account'] = account
    newLines[index]['account_id'] = account ? account.id : ''
    setLines(newLines)
  }

  const calculateTotals = () => {
    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0)
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0)
    const difference = totalDebits - totalCredits
    
    return { totalDebits, totalCredits, difference, isBalanced: Math.abs(difference) < 0.01 }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const totals = calculateTotals()
    if (!totals.isBalanced) {
      alert(`Entry is not balanced!\nDebits: $${totals.totalDebits.toFixed(2)}\nCredits: $${totals.totalCredits.toFixed(2)}\nDifference: $${Math.abs(totals.difference).toFixed(2)}`)
      return
    }

    const payload = {
      ...formData,
      lines: lines.map(line => ({
        account_id: line.account_id,
        debit: parseFloat(line.debit) || 0,
        credit: parseFloat(line.credit) || 0,
        description: line.description || null,
        reference: line.reference || null,
      })),
    }

    saveMutation.mutate(payload)
  }

  const totals = calculateTotals()

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* QuickBooks-style Header */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            {isEdit ? 'Edit' : 'Make'} General Journal Entry
          </Typography>
          <Typography variant="body2">
            Manually record debits and credits
          </Typography>
        </Paper>

        <form onSubmit={handleSubmit}>
          {/* Entry Header */}
          <Paper sx={{ p: 3, mb: 2, border: '1px solid', borderColor: qbColors.border }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this entry"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Memo"
                  multiline
                  rows={2}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes (optional)"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* QB-Style Debit/Credit Table */}
          <TableContainer component={Paper} sx={{ mb: 2, border: '1px solid', borderColor: qbColors.border }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: qbColors.headerBg }}>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Account</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Ref</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'right' }}>Debit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%', textAlign: 'right' }}>Credit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%', textAlign: 'center' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={accounts || []}
                        getOptionLabel={(option) => `${option.account_number} - ${option.account_name}`}
                        value={line.account}
                        onChange={(e, newValue) => handleAccountChange(index, newValue)}
                        renderInput={(params) => <TextField {...params} placeholder="Select account" required />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        placeholder="Line description"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        value={line.reference}
                        onChange={(e) => handleLineChange(index, 'reference', e.target.value)}
                        placeholder="Ref"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={line.debit}
                        onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                        inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={line.credit}
                        onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                        inputProps={{ step: '0.01', min: 0, style: { textAlign: 'right' } }}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveLine(index)}
                        disabled={lines.length <= 2}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Totals Row - QB Style */}
                <TableRow sx={{ bgcolor: totals.isBalanced ? qbColors.lightGreen : '#ffebee' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                    TOTALS:
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}>
                    ${totals.totalDebits.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem' }}>
                    ${totals.totalCredits.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleAddLine}
                    >
                      <AddIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>

                {/* Balance Status Row */}
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                    Difference:
                  </TableCell>
                  <TableCell colSpan={3} sx={{ textAlign: 'center' }}>
                    {totals.isBalanced ? (
                      <Chip label="BALANCED ✓" color="success" size="small" />
                    ) : (
                      <Chip 
                        label={`OUT OF BALANCE: $${Math.abs(totals.difference).toFixed(2)}`} 
                        color="error" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Action Buttons - QB Style */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/accounting/journal-entries')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saveMutation.isLoading || !totals.isBalanced}
              sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
            >
              {saveMutation.isLoading ? 'Saving...' : 'Save as Draft'}
            </Button>
          </Box>

          {!totals.isBalanced && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Entry must be balanced before saving. Total debits must equal total credits.
            </Alert>
          )}
        </form>
      </Box>
    </Container>
  )
}

export default JournalEntryForm

