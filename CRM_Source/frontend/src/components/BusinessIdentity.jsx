import PropTypes from 'prop-types'
import { Box, Typography } from '@mui/material'

const buildAddressLines = (branding) => {
  const lines = []

  if (branding?.business_address_line1) {
    lines.push(branding.business_address_line1)
  }

  if (branding?.business_address_line2) {
    lines.push(branding.business_address_line2)
  }

  const cityState = [branding?.business_city, branding?.business_state]
    .filter(Boolean)
    .join(', ')

  const postal = branding?.business_postal_code
  const country = branding?.business_country

  const locationParts = [cityState || null, postal || null]
    .filter(Boolean)
    .join(' ')

  if (locationParts) {
    lines.push(locationParts)
  }

  if (country) {
    lines.push(country)
  }

  return lines
}

const buildContactLine = (branding) => {
  const contactPieces = []

  if (branding?.business_phone) {
    contactPieces.push(`Phone: ${branding.business_phone}`)
  }

  if (branding?.business_email) {
    contactPieces.push(`Email: ${branding.business_email}`)
  }

  if (branding?.business_website) {
    contactPieces.push(`Web: ${branding.business_website}`)
  }

  return contactPieces.join('   ')
}

const BusinessIdentity = ({ branding, title, dense = false, align = 'left', color = 'inherit', showContact = true, showTaxId = true, sx }) => {
  if (!branding) return null

  const businessName = branding.business_name || branding.crm_name || 'Business'
  const legalName = branding.business_legal_name
  const addressLines = buildAddressLines(branding)
  const contactLine = buildContactLine(branding)
  const taxId = branding.business_tax_id

  const titleVariant = dense ? 'subtitle2' : 'h6'
  const bodyVariant = dense ? 'body2' : 'body1'

  return (
    <Box sx={{ textAlign: align, color, ...sx }}>
      {title && (
        <Typography variant={titleVariant} sx={{ color, fontWeight: dense ? 600 : 700, mb: dense ? 0.5 : 1 }}>
          {title}
        </Typography>
      )}
      <Typography variant={bodyVariant} sx={{ color, fontWeight: 600 }}>
        {businessName}
      </Typography>
      {legalName && (
        <Typography variant="body2" sx={{ color }}>
          {legalName}
        </Typography>
      )}
      {addressLines.map((line, idx) => (
        <Typography key={idx} variant="body2" sx={{ color }}>
          {line}
        </Typography>
      ))}
      {showContact && contactLine && (
        <Typography variant="body2" sx={{ color, mt: 0.5 }}>
          {contactLine}
        </Typography>
      )}
      {showTaxId && taxId && (
        <Typography variant="body2" sx={{ color, mt: 0.5 }}>
          Tax ID: {taxId}
        </Typography>
      )}
    </Box>
  )
}

BusinessIdentity.propTypes = {
  branding: PropTypes.object,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  dense: PropTypes.bool,
  align: PropTypes.oneOf(['left', 'center', 'right']),
  color: PropTypes.string,
  showContact: PropTypes.bool,
  showTaxId: PropTypes.bool,
  sx: PropTypes.object,
}

export default BusinessIdentity

