import { createContext, useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import { useQuery } from 'react-query'
import api from '../services/api'

const AssetLabelContext = createContext({
  singular: 'Asset',
  plural: 'Assets',
  short: 'Asset',
  yachtEnabled: false,
  dmsEnabled: false,
})

export const AssetLabelProvider = ({ children }) => {
  const { data: modules } = useQuery('modules', async () => {
    const response = await api.get('/modules')
    return response.data || []
  })

  const value = useMemo(() => {
    if (!modules) {
      return {
        singular: 'Asset',
        plural: 'Assets',
        short: 'Asset',
        yachtEnabled: false,
        dmsEnabled: false,
      }
    }

    const yachtModule = modules.find((m) => m.key === 'yacht')
    const dmsModule = modules.find((m) => m.key === 'dms')

    const yachtEnabled = yachtModule ? yachtModule.enabled : false
    const dmsEnabled = dmsModule ? dmsModule.enabled : false

    if (yachtEnabled && dmsEnabled) {
      return {
        singular: 'Yacht / Vehicle',
        plural: 'Yachts / Vehicles',
        short: 'Asset',
        yachtEnabled,
        dmsEnabled,
      }
    }

    if (dmsEnabled) {
      return {
        singular: 'Vehicle',
        plural: 'Vehicles',
        short: 'Vehicle',
        yachtEnabled,
        dmsEnabled,
      }
    }

    if (yachtEnabled) {
      return {
        singular: 'Yacht',
        plural: 'Yachts',
        short: 'Yacht',
        yachtEnabled,
        dmsEnabled,
      }
    }

    return {
      singular: 'Asset',
      plural: 'Assets',
      short: 'Asset',
      yachtEnabled,
      dmsEnabled,
    }
  }, [modules])

  return (
    <AssetLabelContext.Provider value={value}>
      {children}
    </AssetLabelContext.Provider>
  )
}

AssetLabelProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAssetLabels = () => useContext(AssetLabelContext)

export default AssetLabelContext
