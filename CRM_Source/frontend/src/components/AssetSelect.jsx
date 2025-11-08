import PropTypes from 'prop-types'
import { useQuery } from 'react-query'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material'
import api from '../services/api'
import { useAssetLabels } from '../context/AssetLabelContext'

const AssetSelect = ({ customerId, value, onChange, label, required, disabled }) => {
  const labels = useAssetLabels()

  const { data: assets } = useQuery(
    ['customer-assets', customerId],
    async () => {
      if (!customerId) return []
      const response = await api.get('/customer/assets', {
        params: { customer_id: customerId },
      })
      return response.data?.data || []
    },
    {
      enabled: Boolean(customerId),
    }
  )

  const selectedValue = value ? `${value.asset_type}:${value.id}` : ''

  return (
    <FormControl fullWidth disabled={disabled || !customerId} required={required}>
      <InputLabel>{label || `${labels.singular} (Optional)`}</InputLabel>
      <Select
        value={selectedValue}
        label={label || `${labels.singular} (Optional)`}
        onChange={(e) => {
          const [type, id] = e.target.value.split(':')
          if (!type || !id) {
            onChange(null)
            return
          }
          const asset = assets.find((a) => `${a.asset_type}:${a.id}` === e.target.value)
          if (asset) {
            onChange(asset)
          } else {
            onChange(null)
          }
        }}
      >
        <MenuItem value="">None</MenuItem>
        {assets?.map((asset) => (
          <MenuItem key={`${asset.asset_type}-${asset.id}`} value={`${asset.asset_type}:${asset.id}`}>
            {asset.display_name || asset.name}
          </MenuItem>
        ))}
      </Select>
      {!customerId && (
        <FormHelperText>Select a customer first</FormHelperText>
      )}
    </FormControl>
  )
}

AssetSelect.propTypes = {
  customerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  value: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    asset_type: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
}

AssetSelect.defaultProps = {
  customerId: '',
  value: null,
  label: '',
  required: false,
  disabled: false,
}

export default AssetSelect
