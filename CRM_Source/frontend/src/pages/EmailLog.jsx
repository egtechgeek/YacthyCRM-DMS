import { useQuery } from 'react-query'
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material'
import api from '../services/api'

const EmailLog = () => {
  const { data, isLoading, error } = useQuery('email-log', async () => {
    const response = await api.get('/email-log')
    return response.data
  }, {
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">Error loading email log</Alert>
      </Container>
    )
  }

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3 }}>Email Log</Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sent At</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                </TableCell>
                <TableCell>{log.recipient_email}</TableCell>
                <TableCell>{log.subject}</TableCell>
                <TableCell>{log.email_type}</TableCell>
                <TableCell>
                  <Chip
                    label={log.status}
                    color={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {log.error_message ? (
                    <Typography variant="body2" color="error">
                      {log.error_message}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}

export default EmailLog

