// frontend/src/components/settings/APIKeyManager.jsx - NEW COMPONENT
const APIKeyManager = () => {
    const [keys, setKeys] = useState({});
    const [showKey, setShowKey] = useState({});
  
    const keyConfigs = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'For GPT-4, GPT-3.5 models',
        icon: '🤖',
        getInstructions: () => 'Get your key from platform.openai.com/api-keys',
        testUrl: 'https://api.openai.com/v1/models',
        pricing: '$0.03 per 1K tokens (GPT-4)'
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'For Claude-3 models',
        icon: '🧠',
        getInstructions: () => 'Get your key from console.anthropic.com',
        pricing: '$0.015 per 1K tokens'
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to 50+ AI models',
        icon: '🔀',
        getInstructions: () => 'Get your key from openrouter.ai/keys',
        pricing: 'Varies by model (often cheaper)'
      }
    ];
  
    const integrationConfigs = [
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'CRM integration',
        icon: '🎯',
        getInstructions: () => 'Create private app in HubSpot developer settings'
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Team notifications',
        icon: '💬',
        getInstructions: () => 'Create webhook in Slack app settings'
      }
    ];
  
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🔑 API Key Management</h2>
          <p className="text-gray-600">
            Connect your own API keys for cost-effective AI workflows. You pay providers directly - no markup!
          </p>
        </div>
  
        {/* LLM Providers */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 AI Model Providers</h3>
          <div className="grid gap-4">
            {keyConfigs.map(config => (
              <APIKeyCard key={config.id} config={config} />
            ))}
          </div>
        </div>
  
        {/* Integration Services */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔗 Integration Services</h3>
          <div className="grid gap-4">
            {integrationConfigs.map(config => (
              <APIKeyCard key={config.id} config={config} />
            ))}
          </div>
        </div>
  
        {/* Cost Calculator */}
        <CostCalculator />
      </div>
    );
  };
  
  const APIKeyCard = ({ config }) => {
    const [key, setKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validation, setValidation] = useState(null);
  
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{config.icon}</span>
            <div>
              <h4 className="font-semibold text-gray-800">{config.name}</h4>
              <p className="text-sm text-gray-600">{config.description}</p>
              {config.pricing && (
                <p className="text-xs text-green-600 mt-1">💰 {config.pricing}</p>
              )}
            </div>
          </div>
          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => window.open(config.getInstructions(), '_blank')}
          >
            Get Key →
          </button>
        </div>
  
        <div className="space-y-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={`Enter your ${config.name} API key`}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => validateKey(config.id, key)}
              disabled={!key || isValidating}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isValidating ? 'Testing...' : 'Test & Save'}
            </button>
            
            {validation && (
              <span className={`text-sm ${
                validation.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {validation.success ? '✅ Valid' : '❌ Invalid'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };