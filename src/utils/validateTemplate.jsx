export const validateTemplate = (template, type) => {
  const requiredFields = {
    agent: ['name', 'role', 'goal', 'backstory'],
    task: ['name', 'description', 'expectedOutput'],
    tool: ['name', 'description', 'toolType', 'parameters'],
    chat: ['name', 'prompt', 'model', 'description'], 
    flow: ['name', 'description', 'nodes', 'edges', 'tags'],
    delay: ['name', 'description', 'duration', 'triggerType', 'runAt'],
    trigger: ['name', 'description', 'triggerType', 'webhook'],
    logic: ['name', 'description', 'condition']
  };
  
  const fields = requiredFields[type] || [];
  const missingFields = fields.filter(field => !template[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};
