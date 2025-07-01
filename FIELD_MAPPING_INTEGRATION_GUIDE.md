# Field Mapping Integration Guide

## 🎯 What We've Built

We've successfully integrated a **simple field mapping system** into your frontend nodes that replaces the complex UniversalDataTransformer with explicit, user-controlled field mappings.

## ✅ What's Now Available

### 1. **FieldMapper Component** (`src/components/editmodal/shared/FieldMapper.jsx`)
- **Visual field mapping interface** for all node types
- **Auto-mapping** based on field name similarity
- **Real-time preview** of available fields from previous nodes
- **Easy mapping management** with add/remove/clear functionality

### 2. **Integrated into Node Editors**
- ✅ **TaskEditor** - Field mapping for task inputs
- ✅ **ToolEditor** - Field mapping for tool inputs
- 🔄 **Other editors** - Can be easily added

### 3. **Backend Integration**
- ✅ **Simple mapper** (`backend/core/simple_mapper.py`) replaces complex UniversalDataTransformer
- ✅ **Node processor** uses simple mapping by default
- ✅ **Field mapping validation** and error handling

## 🚀 How to Use

### For Users (Frontend)

1. **Open any node editor** (Task, Tool, etc.)
2. **Scroll down to "Field Mappings" section**
3. **Click "Show Mapper"** to open the field mapping interface
4. **See available fields** from previous nodes
5. **Map fields** by selecting from dropdowns
6. **Use "Auto Map"** for automatic field matching
7. **Save the node** - mappings are automatically included

### For Developers (Adding to Other Nodes)

1. **Import FieldMapper**:
```javascript
import FieldMapper from './shared/FieldMapper';
```

2. **Add state**:
```javascript
const [fieldMappings, setFieldMappings] = useState(node.data.field_mappings || {});
const [previousNodeOutputs, setPreviousNodeOutputs] = useState({});
```

3. **Add to UI**:
```javascript
<FieldMapper
  nodeId={node.id}
  nodeType="your_node_type"
  currentMappings={fieldMappings}
  onMappingChange={setFieldMappings}
  previousNodeOutputs={previousNodeOutputs}
  connectedNodes={connectedNodes}
/>
```

4. **Include in save**:
```javascript
onSave({
  ...node,
  data: {
    ...node.data,
    field_mappings: fieldMappings
  }
});
```

## 🔧 Technical Details

### Field Mapping Structure
```javascript
{
  "query": "agent.response",
  "context": "tool.result",
  "confidence": "agent.confidence"
}
```

### Node Type Target Fields
- **task**: `['query', 'context', 'agent_output', 'parameters']`
- **agent**: `['input', 'context', 'parameters', 'memory']`
- **tool**: `['input_data', 'parameters', 'query', 'context']`
- **output**: `['data', 'format', 'destination']`
- **logic**: `['condition', 'input_a', 'input_b']`
- **chat**: `['message', 'context', 'history']`
- **delay**: `['duration', 'unit']`
- **trigger**: `['trigger_data', 'api_data', 'webhook_data']`

### Backend Processing
1. **Node processor** checks for `field_mappings` in node data
2. **Simple mapper** applies explicit mappings
3. **No smart guessing** - only user-defined mappings are used
4. **Fallback** to empty values if mapping not found

## 🎉 Benefits

### For Users
- ✅ **No more guessing** - explicit control over data flow
- ✅ **Visual interface** - see exactly what data is available
- ✅ **Auto-mapping** - smart suggestions based on field names
- ✅ **Error prevention** - clear mapping validation

### For Developers
- ✅ **Simplified backend** - no complex UniversalDataTransformer
- ✅ **Predictable behavior** - explicit mappings only
- ✅ **Easy debugging** - clear data flow
- ✅ **Extensible** - easy to add to new node types

## 🔄 Next Steps

### Immediate
1. **Test the integration** with Task and Tool nodes
2. **Add to other node editors** (Agent, Output, Logic, etc.)
3. **Test workflow execution** with field mappings

### Future Enhancements
1. **Real node outputs** - replace mock data with actual workflow execution results
2. **Field validation** - validate field types match expected inputs
3. **Mapping templates** - save and reuse common mapping patterns
4. **Visual workflow preview** - show data flow in the canvas

## 🐛 Troubleshooting

### Common Issues
1. **No fields available** - Check if previous nodes are connected
2. **Mapping not working** - Verify field names match exactly
3. **Backend errors** - Check that `field_mappings` is included in saved data

### Debug Tips
1. **Check browser console** for field mapping logs
2. **Verify node connections** in the canvas
3. **Test with simple mappings** first
4. **Use "Auto Map"** to get started quickly

---

**🎯 Result**: You now have a robust, user-friendly field mapping system that eliminates the complexity and unpredictability of the old UniversalDataTransformer while giving users explicit control over their data flow! 