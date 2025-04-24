import React from 'react';

const CVResultsDisplay = ({ results }) => {
  if (!results) {
    return <div className="text-gray-500">No CV results available</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Experience Section */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Experience</h4>
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-blue-800">
            <span className="font-medium">Total Experience:</span> {results.experience_years} years
          </p>
        </div>
      </div>

      {/* Skills Section */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {results.skills?.map((skill, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Education Section */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Education & Certifications</h4>
        <div className="space-y-2">
          {results.education?.map((edu, index) => (
            <div key={index} className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-800">{edu.degree}</p>
              <p className="text-gray-600 text-sm">{edu.field}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
        <div className="space-y-2">
          {results.contact?.email && (
            <p className="flex items-center gap-2">
              <span className="text-gray-500">📧</span>
              <a href={`mailto:${results.contact.email}`} className="text-blue-600 hover:underline">
                {results.contact.email}
              </a>
            </p>
          )}
          {results.contact?.linkedin && (
            <p className="flex items-center gap-2">
              <span className="text-gray-500">💼</span>
              <a href={`https://${results.contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                LinkedIn Profile
              </a>
            </p>
          )}
          {results.contact?.github && (
            <p className="flex items-center gap-2">
              <span className="text-gray-500">💻</span>
              <a href={`https://${results.contact.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                GitHub Profile
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Text Preview (Collapsible) */}
      {results.extracted_text && (
        <div>
          <details>
            <summary className="font-semibold text-gray-700 cursor-pointer hover:text-blue-600">
              View Extracted Text
            </summary>
            <div className="mt-2 bg-gray-50 p-3 rounded text-sm font-mono overflow-auto max-h-40">
              {results.extracted_text}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default CVResultsDisplay;
