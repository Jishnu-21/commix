const addressValidation = (req, res, next) => {
  const addressData = req.body;
  const requiredFields = [
    'address_name', 'street', 'state', 'house', 
    'postcode', 'location', 'country', 'phone_number'
  ];

  const missingFields = requiredFields.filter(field => !addressData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }

  if (!['Home', 'Work', 'Office', 'Other'].includes(addressData.address_name)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid address_name. Must be one of: Home, Work, Office, Other'
    });
  }

  next();
};

module.exports = addressValidation; 