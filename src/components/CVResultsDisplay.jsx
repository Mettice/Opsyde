import React from 'react';

const CVResultsDisplay = ({ results }) => {
  if (!results) {
    return <div className="text-gray-500">No CV results available</div>;
  }

  // Helper function to render skills based on their structure
  const renderSkills = (skills) => {
    if (!skills) return null;

    // Handle categorized skills (object structure)
    if (typeof skills === 'object' && !Array.isArray(skills)) {
      return Object.entries(skills).map(([category, skillList]) => (
        <div key={category} className="mb-3">
          <h5 className="text-sm font-medium text-gray-700 mb-1 capitalize">
            {category.replace(/_/g, ' ')}
          </h5>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(skillList) && skillList.map((skill, idx) => (
              <span key={`${category}-${idx}`} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>
      ));
    }

    // Handle array structure
    if (Array.isArray(skills)) {
      return (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
              {skill}
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

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
        {Array.isArray(results.experience) && results.experience.length > 0 && (
          <div className="mt-3 space-y-3">
            {results.experience.map((exp, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-gray-600">{exp.company}</p>
                <p className="text-sm text-gray-500">
                  {exp.start_date} - {exp.end_date}
                </p>
                {exp.responsibilities && exp.responsibilities.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                    {exp.responsibilities.map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills Section */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Skills</h4>
        {renderSkills(results.skills)}
      </div>

      {/* Education Section */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">Education</h4>
        <div className="space-y-2">
          {Array.isArray(results.education) && results.education
            .filter(edu => !edu.is_certification)
            .map((edu, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <p className="font-medium text-gray-800">{edu.degree}</p>
              <p className="text-gray-600 text-sm">{edu.field}</p>
              {edu.institution && (
                <p className="text-gray-500 text-sm">{edu.institution}</p>
              )}
              {edu.year && (
                <p className="text-gray-500 text-sm">{edu.year}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Certifications Section */}
      {Array.isArray(results.education) && results.education.some(edu => edu.is_certification) && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Certifications</h4>
          <div className="space-y-2">
            {results.education
              .filter(edu => edu.is_certification)
              .map((cert, index) => (
              <div key={index} className="bg-yellow-50 p-3 rounded">
                <p className="font-medium text-gray-800">{cert.degree}</p>
                {cert.institution && (
                  <p className="text-gray-500 text-sm">{cert.institution}</p>
                )}
                {cert.year && (
                  <p className="text-gray-500 text-sm">{cert.year}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Information */}
      {results.contact && (
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
          <div className="space-y-2">
            {results.contact.email && (
              <p className="flex items-center gap-2">
                <span className="text-gray-500">📧</span>
                <a href={`mailto:${results.contact.email}`} className="text-blue-600 hover:underline">
                  {results.contact.email}
                </a>
              </p>
            )}
            {results.contact.phone && (
              <p className="flex items-center gap-2">
                <span className="text-gray-500">📱</span>
                <span className="text-gray-700">{results.contact.phone}</span>
              </p>
            )}
            {results.contact.linkedin && (
              <p className="flex items-center gap-2">
                <span className="text-gray-500">💼</span>
                <a href={`https://${results.contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  LinkedIn Profile
                </a>
              </p>
            )}
            {results.contact.github && (
              <p className="flex items-center gap-2">
                <span className="text-gray-500">💻</span>
                <a href={`https://${results.contact.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  GitHub Profile
                </a>
              </p>
            )}
          </div>
        </div>
      )}

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
