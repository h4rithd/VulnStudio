
// Helper function to check if ID is a temporary project ID
const isTempId = (id) => {
  return typeof id === 'string' && id.startsWith('temp_');
};

// Helper function to validate UUID format
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

module.exports = {
  isTempId,
  isValidUUID
};
