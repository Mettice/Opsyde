import React, { useState } from 'react';
import { validateWorkflowExecution, formatValidationResult } from '../../utils/workflowValidator';
import './WorkflowValidationCard.css';

const WorkflowValidationCard = ({ 
  results, 
  workflowData, 
  className = "",
  showDetails = true,
  onValidationComplete = null 
}) => {
  const [validationResult, setValidationResult] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Run validation when results change
  React.useEffect(() => {
    if (results && workflowData) {
      const result = validateWorkflowExecution(results, workflowData);
      const formattedResult = formatValidationResult(result);
      setValidationResult(formattedResult);
      
      if (onValidationComplete) {
        onValidationComplete(formattedResult);
      }
    }
  }, [results, workflowData, onValidationComplete]);

  if (!validationResult) {
    return (
      <div className={`workflow-validation-card loading ${className}`}>
        <div className="validation-header">
          <h3>🔍 Workflow Validation</h3>
          <div className="loading-spinner">⏳ Analyzing results...</div>
        </div>
      </div>
    );
  }

  const { displayStatus, contentLength, contentRelevance, answerRelevance, errors, warnings, summary } = validationResult;

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'partial': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className={`workflow-validation-card ${className}`}>
      <div className="validation-header">
        <h3>🔍 Workflow Validation</h3>
        <div 
          className="validation-status"
          style={{ color: getStatusColor(displayStatus.status) }}
        >
          {getStatusIcon(displayStatus.status)} {displayStatus.status.toUpperCase()}
        </div>
      </div>

      <div className="validation-summary">
        <p>{summary}</p>
      </div>

      {showDetails && (
        <>
          <div className="validation-metrics">
            {/* Content Length */}
            <div className="metric-item">
              <div className="metric-label">
                📏 Content Length
              </div>
              <div className={`metric-value ${contentLength.passed ? 'success' : 'failed'}`}>
                {contentLength.length} chars
                <span className="metric-icon">
                  {contentLength.passed ? '✅' : '❌'}
                </span>
              </div>
            </div>

            {/* Content Relevance */}
            {contentRelevance.score > 0 && (
              <div className="metric-item">
                <div className="metric-label">
                  🎯 Content Relevance
                </div>
                <div className={`metric-value ${contentRelevance.passed ? 'success' : 'partial'}`}>
                  {(contentRelevance.score * 100).toFixed(1)}%
                  <span className="metric-icon">
                    {contentRelevance.passed ? '✅' : '⚠️'}
                  </span>
                </div>
                {isExpanded && contentRelevance.expected.length > 0 && (
                  <div className="metric-details">
                    <div className="keywords-section">
                      <strong>Expected:</strong> {contentRelevance.expected.join(', ')}
                    </div>
                    <div className="keywords-section">
                      <strong>Found:</strong> {contentRelevance.found.join(', ') || 'None'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Answer Relevance */}
            {answerRelevance.score > 0 && (
              <div className="metric-item">
                <div className="metric-label">
                  💬 Answer Relevance
                </div>
                <div className={`metric-value ${answerRelevance.passed ? 'success' : 'partial'}`}>
                  {(answerRelevance.score * 100).toFixed(1)}%
                  <span className="metric-icon">
                    {answerRelevance.passed ? '✅' : '⚠️'}
                  </span>
                </div>
                {isExpanded && answerRelevance.expected.length > 0 && (
                  <div className="metric-details">
                    <div className="keywords-section">
                      <strong>Expected:</strong> {answerRelevance.expected.join(', ')}
                    </div>
                    <div className="keywords-section">
                      <strong>Found:</strong> {answerRelevance.found.join(', ') || 'None'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Errors and Warnings */}
          {(errors.length > 0 || warnings.length > 0) && (
            <div className="validation-issues">
              {errors.length > 0 && (
                <div className="issues-section errors">
                  <h4>❌ Errors ({errors.length})</h4>
                  <ul>
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {warnings.length > 0 && (
                <div className="issues-section warnings">
                  <h4>⚠️ Warnings ({warnings.length})</h4>
                  <ul>
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '🔽 Hide Details' : '🔼 Show Details'}
          </button>
        </>
      )}
    </div>
  );
};

export default WorkflowValidationCard; 