/**
 * Frontend Workflow Validation Utilities
 * 
 * This module provides intelligent validation functions for workflow execution results.
 * It mirrors the backend validation logic for consistent validation across the stack.
 */

class WorkflowValidator {
  constructor() {
    // Common words to filter out when extracting keywords
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'about', 'create', 'write',
      'generate', 'make', 'build', 'develop', 'short', 'long', 'story', 'content', 'text',
      'answer', 'explain', 'describe', 'tell', 'me', 'you', 'your', 'my', 'this', 'that',
      'these', 'those', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose', 'whom'
    ]);

    // Common content indicators
    this.contentIndicators = [
      'content', 'result', 'output', 'answer', 'response', 'information', 'data', 'text'
    ];
  }

  /**
   * Extract meaningful keywords from input text
   */
  extractKeywordsFromInput(inputText) {
    if (!inputText) {
      return [];
    }

    // Extract words and filter
    const words = inputText.toLowerCase().split(/\s+/);
    const keywords = [];

    for (const word of words) {
      // Clean the word (remove punctuation)
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanWord && cleanWord.length > 2 && !this.stopWords.has(cleanWord)) {
        keywords.push(cleanWord);
      }
    }

    // Remove duplicates
    return [...new Set(keywords)];
  }

  /**
   * Extract expected answer keywords from a question
   */
  extractExpectedAnswers(question) {
    if (!question) {
      return [];
    }

    const questionLower = question.toLowerCase();
    let expectedAnswers = [];

    // Handle specific question patterns
    if (questionLower.includes('capital') && questionLower.includes('france')) {
      expectedAnswers = ['paris', 'france', 'capital'];
    } else if (questionLower.includes('capital')) {
      expectedAnswers = ['capital', 'city', 'country'];
    } else if (questionLower.includes('what') && questionLower.includes('is')) {
      // Extract the subject after "what is"
      const words = questionLower.split(/\s+/);
      const whatIndex = words.indexOf('what');
      if (whatIndex !== -1 && whatIndex + 2 < words.length && words[whatIndex + 1] === 'is') {
        const subject = words[whatIndex + 2];
        expectedAnswers = [subject, 'answer', 'information'];
      } else {
        expectedAnswers = ['answer', 'information', 'response'];
      }
    } else {
      expectedAnswers = ['answer', 'information', 'response', 'result'];
    }

    return expectedAnswers;
  }

  /**
   * Calculate content relevance score based on input keywords
   */
  calculateContentRelevance(content, inputText) {
    if (!content || !inputText) {
      return { score: 0.0, expected: [], found: [] };
    }

    // Extract keywords from input
    const expectedKeywords = this.extractKeywordsFromInput(inputText);
    const additionalKeywords = this.contentIndicators.filter(
      indicator => !expectedKeywords.includes(indicator)
    );
    expectedKeywords.push(...additionalKeywords);

    // Check for keyword matches (case-insensitive)
    const foundKeywords = [];
    const contentLower = content.toLowerCase();

    for (const keyword of expectedKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    // Calculate relevance score
    const relevanceScore = expectedKeywords.length > 0 
      ? foundKeywords.length / expectedKeywords.length 
      : 0;

    return {
      score: relevanceScore,
      expected: expectedKeywords,
      found: foundKeywords
    };
  }

  /**
   * Calculate answer relevance score based on question
   */
  calculateAnswerRelevance(answer, question) {
    if (!answer || !question) {
      return { score: 0.0, expected: [], found: [] };
    }

    // Extract expected answers from question
    const expectedAnswers = this.extractExpectedAnswers(question);

    // Check for expected answers in the result
    const foundAnswers = [];
    const answerLower = answer.toLowerCase();

    for (const expected of expectedAnswers) {
      if (answerLower.includes(expected)) {
        foundAnswers.push(expected);
      }
    }

    // Calculate relevance score
    const relevanceScore = expectedAnswers.length > 0 
      ? foundAnswers.length / expectedAnswers.length 
      : 0;

    return {
      score: relevanceScore,
      expected: expectedAnswers,
      found: foundAnswers
    };
  }

  /**
   * Validate content length
   */
  validateContentLength(content, minLength = 50) {
    if (!content) {
      return { passed: false, length: 0 };
    }

    const contentLength = content.length;
    return {
      passed: contentLength >= minLength,
      length: contentLength
    };
  }

  /**
   * Extract final content from workflow results
   */
  extractFinalContent(results) {
    if (!results || !Array.isArray(results)) {
      return null;
    }

    // Look for output node result
    for (const result of results) {
      if (result.node_type === 'output') {
        // Try to extract content from the result
        let outputData = result.result || result.output || result.input;
        if (!outputData) {
          continue;
        }

        // Unwrap NodeData if needed
        if (outputData.value !== undefined) {
          outputData = outputData.value;
        }

        // Extract content from complex structure
        if (typeof outputData === 'object' && outputData !== null) {
          for (const key of ['text_context', 'task_output', 'content', 'result', 'value']) {
            if (outputData[key]) {
              let content = outputData[key];
              if (content.value !== undefined) {
                content = content.value;
              }
              if (typeof content === 'string' && content.trim()) {
                return content.trim();
              }
            }
          }
        }

        // Fallback to string representation
        if (typeof outputData === 'string') {
          return outputData.trim();
        }
      }
    }

    return null;
  }

  /**
   * Comprehensive workflow validation
   */
  validateWorkflowResults(results, workflowData) {
    const validationResult = {
      success: false,
      contentLength: { passed: false, length: 0 },
      contentRelevance: { passed: false, score: 0.0, expected: [], found: [] },
      answerRelevance: { passed: false, score: 0.0, expected: [], found: [] },
      errors: [],
      warnings: []
    };

    try {
      // Extract final content from results
      const finalContent = this.extractFinalContent(results);
      if (!finalContent) {
        validationResult.errors.push("No final content found in results");
        return validationResult;
      }

      // Validate content length
      const lengthValidation = this.validateContentLength(finalContent);
      validationResult.contentLength = lengthValidation;

      // Validate content relevance (for creative workflows)
      const originalInput = workflowData?.inputs?.['input-test-data'] || '';
      if (originalInput) {
        const relevanceResult = this.calculateContentRelevance(finalContent, originalInput);
        validationResult.contentRelevance = {
          passed: relevanceResult.score >= 0.5,
          score: relevanceResult.score,
          expected: relevanceResult.expected,
          found: relevanceResult.found
        };
      }

      // Validate answer relevance (for Q&A workflows)
      const originalQuestion = workflowData?.inputs?.['input-api-test'] || '';
      if (originalQuestion) {
        const answerResult = this.calculateAnswerRelevance(finalContent, originalQuestion);
        validationResult.answerRelevance = {
          passed: answerResult.score >= 0.5,
          score: answerResult.score,
          expected: answerResult.expected,
          found: answerResult.found
        };
      }

      // Overall success
      validationResult.success = (
        lengthValidation.passed && 
        (validationResult.contentRelevance.passed || validationResult.answerRelevance.passed)
      );

    } catch (error) {
      validationResult.errors.push(`Validation error: ${error.message}`);
    }

    return validationResult;
  }

  /**
   * Get validation status with color coding
   */
  getValidationStatus(validationResult) {
    if (validationResult.success) {
      return { status: 'success', color: 'green', icon: '✅' };
    } else if (validationResult.contentLength.passed || 
               validationResult.contentRelevance.score >= 0.2 || 
               validationResult.answerRelevance.score >= 0.2) {
      return { status: 'partial', color: 'yellow', icon: '⚠️' };
    } else {
      return { status: 'failed', color: 'red', icon: '❌' };
    }
  }

  /**
   * Format validation result for display
   */
  formatValidationResult(validationResult) {
    const status = this.getValidationStatus(validationResult);
    
    return {
      ...validationResult,
      displayStatus: status,
      summary: this.generateValidationSummary(validationResult)
    };
  }

  /**
   * Generate human-readable validation summary
   */
  generateValidationSummary(validationResult) {
    const parts = [];

    if (validationResult.contentLength.passed) {
      parts.push(`Content length: ${validationResult.contentLength.length} chars ✅`);
    } else {
      parts.push(`Content length: ${validationResult.contentLength.length} chars ❌`);
    }

    if (validationResult.contentRelevance.score > 0) {
      const score = (validationResult.contentRelevance.score * 100).toFixed(1);
      const status = validationResult.contentRelevance.passed ? '✅' : '⚠️';
      parts.push(`Content relevance: ${score}% ${status}`);
    }

    if (validationResult.answerRelevance.score > 0) {
      const score = (validationResult.answerRelevance.score * 100).toFixed(1);
      const status = validationResult.answerRelevance.passed ? '✅' : '⚠️';
      parts.push(`Answer relevance: ${score}% ${status}`);
    }

    return parts.join(' | ');
  }
}

// Global validator instance
const workflowValidator = new WorkflowValidator();

// Export functions for easy use
export const validateWorkflowExecution = (results, workflowData) => {
  return workflowValidator.validateWorkflowResults(results, workflowData);
};

export const extractKeywords = (inputText) => {
  return workflowValidator.extractKeywordsFromInput(inputText);
};

export const calculateRelevance = (content, inputText) => {
  return workflowValidator.calculateContentRelevance(content, inputText);
};

export const formatValidationResult = (validationResult) => {
  return workflowValidator.formatValidationResult(validationResult);
};

export default workflowValidator; 