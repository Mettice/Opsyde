import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getCategoryList, getServicesForCategory, getServiceConfig } from '../../utils/toolCategories';

// Category Selector Component
const CategorySelector = ({ selectedCategory, onCategorySelect, onClose }) => {
  const categories = getCategoryList();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className="relative p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all group"
        >
          <div className="text-center">
            <div className="text-4xl mb-3">{category.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{category.description}</p>
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
              {category.serviceCount} services available
            </div>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-blue-500">→</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Service Selector Component
const ServiceSelector = ({ categoryId, selectedService, onServiceSelect, onBack }) => {
  const services = getServicesForCategory(categoryId);
  const categoryName = getCategoryList().find(cat => cat.id === categoryId)?.name || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Back to Categories
        </button>
        <h2 className="text-xl font-bold text-gray-900">{categoryName}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => onServiceSelect(service.id)}
            className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">{service.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {service.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Pricing:</span> {service.pricing}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Provider:</span> {service.provider}
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-green-500 text-xl">✓</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Configuration Panel Component
const ConfigurationPanel = ({ categoryId, serviceId, config, onConfigChange, onSave, onBack }) => {
  const [formData, setFormData] = useState(config || {});
  const [errors, setErrors] = useState({});

  const serviceConfig = getServiceConfig(categoryId, serviceId);
  if (!serviceConfig) return null;

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }

    // Notify parent of changes
    onConfigChange({
      ...formData,
      [fieldName]: value
    });
  };

  const validateForm = () => {
    const newErrors = {};
    const fields = serviceConfig.config.fields;

    Object.entries(fields).forEach(([fieldName, field]) => {
      if (field.required && !formData[fieldName]) {
        newErrors[fieldName] = `${field.label} is required`;
      }
      
      if (field.type === 'number' && formData[fieldName]) {
        const value = Number(formData[fieldName]);
        if (field.min !== undefined && value < field.min) {
          newErrors[fieldName] = `Minimum value is ${field.min}`;
        }
        if (field.max !== undefined && value > field.max) {
          newErrors[fieldName] = `Maximum value is ${field.max}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (toolData) => {
    try {
      // Add debugging to see what's being passed
      console.log('handleSave received toolData:', toolData);
      
      // Extract data with fallbacks
      const categoryId = toolData.categoryId || selectedCategory;
      const serviceId = toolData.serviceId || selectedService;
      const config = toolData.config || toolConfig;
      const serviceConfig = toolData.serviceConfig;
      
      // Validate we have the required data
      if (!categoryId || !serviceId) {
        console.error('Missing required IDs:', { categoryId, serviceId, selectedCategory, selectedService });
        alert('Error: Missing category or service information');
        return;
      }
      
      if (!serviceConfig) {
        console.error('Missing service configuration');
        alert('Error: Service configuration not found');
        return;
      }
  
      // Transform the configuration for backend compatibility
      const { transformConfigForBackend, generateWorkflowNode } = await import('../../utils/toolMapping');
      
      const transformedConfig = transformConfigForBackend(
        categoryId,
        serviceId,
        config,
        serviceConfig
      );
      
      // Test the configuration with the backend (updated endpoint)
      const testResponse = await fetch('/api/tools/services/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: transformedConfig.category,
          service: transformedConfig.service,
          config: transformedConfig.config
        })
      });
      
      const testResult = await testResponse.json();
      
      if (!testResult.success) {
        console.error('Backend validation failed:', testResult);
        alert('Configuration validation failed. Please check your settings.');
        return;
      }
      
      // Generate workflow node for frontend
      const workflowNode = generateWorkflowNode(transformedConfig, serviceConfig);
      
      // Add backend execution information to the node
      workflowNode.data.executionConfig = {
        category: transformedConfig.category,
        service: transformedConfig.service,
        provider: transformedConfig.provider,
        config: transformedConfig.config
      };
      
      // Call the parent's tool selection handler
      onToolSelect(workflowNode);
      onClose();
      
    } catch (error) {
      console.error('Error creating tool:', error);
      alert(`Failed to create tool: ${error.message}`);
    }
  };

  const renderField = (fieldName, field) => {
    const value = formData[fieldName] || field.default || '';
    const error = errors[fieldName];

    const baseClasses = "w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    const errorClasses = error ? "border-red-300" : "border-gray-300";

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
            maxLength={field.maxLength}
          />
        );

      case 'password':
        return (
          <div className="relative">
            <input
              type="password"
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={field.placeholder}
              className={`${baseClasses} ${errorClasses} pr-10`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-400">🔐</span>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses} resize-none`}
            rows={4}
            maxLength={field.maxLength}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={`${baseClasses} ${errorClasses}`}
          >
            <option value="">Select {field.label}...</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full"
              min={field.min}
              max={field.max}
              step={field.step}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{field.min}</span>
              <span className="font-medium">{value}</span>
              <span>{field.max}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Services
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{serviceConfig.icon}</span>
            <h2 className="text-xl font-bold text-gray-900">{serviceConfig.name}</h2>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Provider:</span>
          <span className="text-sm font-medium text-gray-900">{serviceConfig.provider}</span>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">{serviceConfig.description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {serviceConfig.capabilities.map((capability, index) => (
            <span
              key={index}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
        <div className="space-y-4">
          {Object.entries(serviceConfig.config.fields).map(([fieldName, field]) => (
            <div key={fieldName}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(fieldName, field)}
              {field.description && (
                <p className="mt-1 text-xs text-gray-500">{field.description}</p>
              )}
              {errors[fieldName] && (
                <p className="mt-1 text-xs text-red-600">{errors[fieldName]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Tool
        </button>
      </div>
    </div>
  );
};

// Main Smart Tool Selector Component
const SmartToolSelector = ({ onToolSelect, onClose }) => {
  const [currentStep, setCurrentStep] = useState('category'); // 'category', 'service', 'config'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [toolConfig, setToolConfig] = useState({});

  const handleCategorySelect = (categoryId) => {
    console.log('Selected category:', categoryId);
    setSelectedCategory(categoryId);
    setCurrentStep('service');
  };

  const handleServiceSelect = (serviceId) => {
    console.log('Selected service:', serviceId);
    setSelectedService(serviceId);
    setCurrentStep('config');
  };

  const handleConfigChange = (config) => {
    console.log('Config changed:', config);
    setToolConfig(config);
  };

  const handleSave = (toolData) => {
    // Transform the configuration into a format compatible with your existing system
    const serviceConfig = toolData.serviceConfig;
    const config = toolData.config;

    const transformedTool = {
      // Basic node properties
      label: serviceConfig.name,
      description: serviceConfig.description,
      
      // Tool configuration
      toolType: serviceConfig.toolType,
      framework: serviceConfig.framework,
      
      // Framework configuration (API endpoints, headers, etc.)
      frameworkConfig: {
        ...serviceConfig.frameworkConfig,
        // Replace placeholder values with actual config values
        ...Object.fromEntries(
          Object.entries(serviceConfig.frameworkConfig.headers || {}).map(([key, value]) => [
            key,
            value.includes('${') ? value : value
          ])
        )
      },
      
      // Service-specific configuration
      ...config,
      
      // Metadata
      category: toolData.categoryId,
      service: toolData.serviceId,
      provider: serviceConfig.provider,
      capabilities: serviceConfig.capabilities,
      pricing: serviceConfig.pricing
    };

    onToolSelect(transformedTool);
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'config') {
      setCurrentStep('service');
    } else if (currentStep === 'service') {
      setCurrentStep('category');
      setSelectedCategory(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentStep === 'category' && 'Choose Tool Category'}
            {currentStep === 'service' && 'Select Service'}
            {currentStep === 'config' && 'Configure Tool'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'category' && (
            <CategorySelector
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              onClose={onClose}
            />
          )}

          {currentStep === 'service' && (
            <ServiceSelector
              categoryId={selectedCategory}
              selectedService={selectedService}
              onServiceSelect={handleServiceSelect}
              onBack={handleBack}
            />
          )}

          {currentStep === 'config' && (
            <ConfigurationPanel
              categoryId={selectedCategory}
              serviceId={selectedService}
              config={toolConfig}
              onConfigChange={handleConfigChange}
              onSave={handleSave}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Footer with step indicator */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'category' ? 'text-blue-600' : currentStep === 'service' || currentStep === 'config' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${currentStep === 'category' ? 'bg-blue-600' : currentStep === 'service' || currentStep === 'config' ? 'bg-green-600' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Category</span>
            </div>
            <div className="w-8 h-px bg-gray-300 mt-1.5"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'service' ? 'text-blue-600' : currentStep === 'config' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${currentStep === 'service' ? 'bg-blue-600' : currentStep === 'config' ? 'bg-green-600' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Service</span>
            </div>
            <div className="w-8 h-px bg-gray-300 mt-1.5"></div>
            <div className={`flex items-center space-x-2 ${currentStep === 'config' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${currentStep === 'config' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">Configure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// PropTypes
CategorySelector.propTypes = {
  selectedCategory: PropTypes.string,
  onCategorySelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

ServiceSelector.propTypes = {
  categoryId: PropTypes.string.isRequired,
  selectedService: PropTypes.string,
  onServiceSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired
};

ConfigurationPanel.propTypes = {
  categoryId: PropTypes.string.isRequired,
  serviceId: PropTypes.string.isRequired,
  config: PropTypes.object,
  onConfigChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired
};

SmartToolSelector.propTypes = {
  onToolSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default SmartToolSelector;