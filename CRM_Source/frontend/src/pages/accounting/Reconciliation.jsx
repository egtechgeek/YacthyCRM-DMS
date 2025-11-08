import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material'
import { CheckCircle as ReconcileIcon } from '@mui/icons-material'
import api from '../../services/api'

const Reconciliation = () => {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0])
  const [statementBalance, setStatementBalance] = useState(0)

  const qbColors = {
    primary: '#2c5f2d',
  }

  const { data: bankAccounts } = useQuery(
    'bankAccounts',
    () => api.get('/accounting/bank-accounts').then(res => res.data)
  )

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: qbColors.primary, color: '#fff', borderRadius: 0 }}>
          <Typography variant="h5" fontWeight="bold">
            <ReconcileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Bank Reconciliation
          </Typography>
          <Typography variant="body2">
            Reconcile your bank accounts with statements
          </Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Bank reconciliation helps you match your bank statement with your CRM records.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Select Bank Account *"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <MenuItem value="">Select an account...</MenuItem>
                {bankAccounts?.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.account_name} - ${parseFloat(account.current_balance || 0).toFixed(2)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Statement Date *"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Statement Ending Balance *"
                value={statementBalance}
                onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
                inputProps={{ step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!selectedAccount || !statementDate}
                sx={{ bgcolor: qbColors.primary, '&:hover': { bgcolor: '#1e4620' } }}
              >
                Start Reconciliation
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> After clicking "Start Reconciliation", you'll be able to mark transactions as cleared
              and match them to your bank statement. The system will automatically calculate the difference and help you
              identify any discrepancies.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Reconciliation

