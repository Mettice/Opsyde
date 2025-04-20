import React from 'react';

const CVResultsDisplay = ({ results }) => {
  if (!results || !results.type === 'huggingface_result') {
    return <div>No CV results available</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 my-4">
      <h3 className="text-xl font-bold mb-4">CV Analysis Results</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700">Candidate Information</h4>
          <div className="mt-2">
            <p><span className="font-medium">Name:</span> {results.candidate_name}</p>
            <p><span className="font-medium">Education:</span> {results.education}</p>
            <p><span className="font-medium">Experience:</span> {results.experience_years} years</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-700">Skills</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {results.skills && results.skills.map((skill, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {results.extracted_text_preview && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700">Extracted Text Preview</h4>
          <div className="mt-2 bg-gray-50 p-3 rounded text-sm font-mono overflow-auto max-h-40">
            {results.extracted_text_preview}
          </div>
        </div>
      )}
    </div>
  );
};

export default CVResultsDisplay;
