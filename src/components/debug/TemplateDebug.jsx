import React from 'react';
import { linkedinTemplates } from '../../data/linkedinTemplates';
import { flowTemplates } from '../../data/flowTemplates';

const TemplateDebug = () => {
  console.log('🔍 TemplateDebug Component');
  console.log('LinkedIn templates:', linkedinTemplates);
  console.log('Flow templates:', flowTemplates);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-bold mb-4">Template Debug Info</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-blue-600 mb-2">
            Flow Templates ({flowTemplates?.length || 0})
          </h3>
          <div className="space-y-1">
            {flowTemplates?.slice(0, 3).map((template, idx) => (
              <div key={idx} className="text-sm bg-white p-2 rounded">
                {template.name}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-blue-600 mb-2">
            LinkedIn Templates ({linkedinTemplates?.length || 0})
          </h3>
          <div className="space-y-1">
            {linkedinTemplates?.slice(0, 3).map((template, idx) => (
              <div key={idx} className="text-sm bg-white p-2 rounded">
                <div className="flex items-center gap-2">
                  <span>💼</span>
                  <span>{template.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {template.category} • {template.difficulty} • {template.nodes?.length} nodes
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Import Status:</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <div>✅ Flow Templates: {flowTemplates ? 'Loaded' : 'Failed'}</div>
          <div>
            {linkedinTemplates ? '✅' : '❌'} LinkedIn Templates: {linkedinTemplates ? 'Loaded' : 'Failed'}
          </div>
          <div>📊 Total Available: {(flowTemplates?.length || 0) + (linkedinTemplates?.length || 0)}</div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDebug; 