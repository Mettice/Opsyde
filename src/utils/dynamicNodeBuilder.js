// Utility to build a node from backend schema dynamically
export async function buildNodeFromSchema({ id, type, x = 100, y = 100, overrides = {} }) {
  // Fetch schema from backend
  const res = await fetch(`/api/nodes/schema/${type}`);
  const { data: schema } = await res.json();

  // Build data object with required fields
  const data = {};
  if (schema && schema.properties) {
    for (const [field, props] of Object.entries(schema.properties)) {
      if (props.required && props.default !== undefined) {
        data[field] = props.default;
      } else if (props.required) {
        // Fallback: use empty string/array/object based on type
        if (props.type === 'string') data[field] = '';
        else if (props.type === 'array') data[field] = [];
        else if (props.type === 'object') data[field] = {};
        else if (props.type === 'number') data[field] = 0;
        else if (props.type === 'boolean') data[field] = false;
      }
    }
  }

  // Apply any overrides (custom values)
  Object.assign(data, overrides);

  return {
    id,
    type,
    position: { x, y },
    data
  };
} 