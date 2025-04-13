export const validateTemplate = (template, type) => {
  const requiredFields = {
    agent: ['name', 'role', 'goal', 'backstory'],
    task: ['name', 'description', 'expectedOutput'],
    tool: ['name', 'description', 'toolType', 'parameters'],
    flow: ['name', 'description', 'nodes', 'edges', 'tags']
  };
  
  const fields = requiredFields[type] || [];
  const missingFields = fields.filter(field => !template[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};
