"""
Workflow Validation Utilities

This module provides intelligent validation functions for workflow execution results.
It can be used by both backend tests and frontend integration.
"""

import re
from typing import Dict, List, Any, Tuple, Optional


class WorkflowValidator:
    """Intelligent workflow validation with dynamic keyword extraction and relevance scoring"""
    
    def __init__(self):
        # Common words to filter out when extracting keywords
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'about', 'create', 'write',
            'generate', 'make', 'build', 'develop', 'short', 'long', 'story', 'content', 'text',
            'answer', 'explain', 'describe', 'tell', 'me', 'you', 'your', 'my', 'this', 'that',
            'these', 'those', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'whose', 'whom'
        }
        
        # Common content indicators
        self.content_indicators = [
            'content', 'result', 'output', 'answer', 'response', 'information', 'data', 'text'
        ]
    
    def extract_keywords_from_input(self, input_text: str) -> List[str]:
        """Extract meaningful keywords from input text"""
        if not input_text:
            return []
        
        # Extract words and filter
        words = input_text.lower().split()
        keywords = []
        
        for word in words:
            # Clean the word (remove punctuation)
            clean_word = ''.join(c for c in word if c.isalnum())
            if clean_word and len(clean_word) > 2 and clean_word not in self.stop_words:
                keywords.append(clean_word)
        
        return list(set(keywords))  # Remove duplicates
    
    def extract_expected_answers(self, question: str) -> List[str]:
        """Extract expected answer keywords from a question"""
        question_lower = question.lower()
        expected_answers = []
        
        # Handle specific question patterns
        if 'capital' in question_lower and 'france' in question_lower:
            expected_answers = ['paris', 'france', 'capital']
        elif 'capital' in question_lower:
            expected_answers = ['capital', 'city', 'country']
        elif 'what' in question_lower and 'is' in question_lower:
            # Extract the subject after "what is"
            words = question_lower.split()
            try:
                what_index = words.index('what')
                if what_index + 2 < len(words) and words[what_index + 1] == 'is':
                    subject = words[what_index + 2]
                    expected_answers = [subject, 'answer', 'information']
            except ValueError:
                expected_answers = ['answer', 'information', 'response']
        else:
            expected_answers = ['answer', 'information', 'response', 'result']
        
        return expected_answers
    
    def calculate_content_relevance(self, content: str, input_text: str) -> Tuple[float, List[str], List[str]]:
        """Calculate content relevance score based on input keywords"""
        if not content or not input_text:
            return 0.0, [], []
        
        # Extract keywords from input
        expected_keywords = self.extract_keywords_from_input(input_text)
        expected_keywords.extend([indicator for indicator in self.content_indicators 
                                if indicator not in expected_keywords])
        
        # Check for keyword matches (case-insensitive)
        found_keywords = []
        content_lower = content.lower()
        
        for keyword in expected_keywords:
            if keyword.lower() in content_lower:
                found_keywords.append(keyword)
        
        # Calculate relevance score
        relevance_score = len(found_keywords) / len(expected_keywords) if expected_keywords else 0
        
        return relevance_score, expected_keywords, found_keywords
    
    def calculate_answer_relevance(self, answer: str, question: str) -> Tuple[float, List[str], List[str]]:
        """Calculate answer relevance score based on question"""
        if not answer or not question:
            return 0.0, [], []
        
        # Extract expected answers from question
        expected_answers = self.extract_expected_answers(question)
        
        # Check for expected answers in the result
        found_answers = []
        answer_lower = answer.lower()
        
        for expected in expected_answers:
            if expected in answer_lower:
                found_answers.append(expected)
        
        # Calculate relevance score
        relevance_score = len(found_answers) / len(expected_answers) if expected_answers else 0
        
        return relevance_score, expected_answers, found_answers
    
    def validate_content_length(self, content: str, min_length: int = 50) -> Tuple[bool, int]:
        """Validate content length"""
        if not content:
            return False, 0
        
        content_length = len(content)
        return content_length >= min_length, content_length
    
    def validate_workflow_results(self, results: List[Dict[str, Any]], 
                                workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive workflow validation"""
        validation_result = {
            'success': False,
            'content_length': {'passed': False, 'length': 0},
            'content_relevance': {'passed': False, 'score': 0.0, 'expected': [], 'found': []},
            'answer_relevance': {'passed': False, 'score': 0.0, 'expected': [], 'found': []},
            'errors': [],
            'warnings': []
        }
        
        try:
            # Extract final content from results
            final_content = self.extract_final_content(results)
            if not final_content:
                validation_result['errors'].append("No final content found in results")
                return validation_result
            
            # Validate content length
            length_passed, content_length = self.validate_content_length(final_content)
            validation_result['content_length'] = {
                'passed': length_passed,
                'length': content_length
            }
            
            # Validate content relevance (for creative workflows)
            original_input = workflow_data.get('inputs', {}).get('input-test-data', '')
            if original_input:
                relevance_score, expected_keywords, found_keywords = self.calculate_content_relevance(
                    final_content, original_input
                )
                validation_result['content_relevance'] = {
                    'passed': relevance_score >= 0.5,
                    'score': relevance_score,
                    'expected': expected_keywords,
                    'found': found_keywords
                }
            
            # Validate answer relevance (for Q&A workflows)
            original_question = workflow_data.get('inputs', {}).get('input-api-test', '')
            if original_question:
                answer_score, expected_answers, found_answers = self.calculate_answer_relevance(
                    final_content, original_question
                )
                validation_result['answer_relevance'] = {
                    'passed': answer_score >= 0.5,
                    'score': answer_score,
                    'expected': expected_answers,
                    'found': found_answers
                }
            
            # Overall success
            validation_result['success'] = (
                length_passed and 
                (validation_result['content_relevance']['passed'] or 
                 validation_result['answer_relevance']['passed'])
            )
            
        except Exception as e:
            validation_result['errors'].append(f"Validation error: {str(e)}")
        
        return validation_result
    
    def extract_final_content(self, results: List[Dict[str, Any]]) -> Optional[str]:
        """Extract final content from workflow results"""
        if not results:
            return None
        
        # Look for output node result
        for result in results:
            if result.get('node_type') == 'output':
                # Try to extract content from the result
                output_data = result.get('result') or result.get('output') or result.get('input')
                if not output_data:
                    continue
                
                # Unwrap NodeData if needed
                if hasattr(output_data, 'value'):
                    output_data = output_data.value
                
                # Extract content from complex structure
                if isinstance(output_data, dict):
                    for key in ['text_context', 'task_output', 'content', 'result', 'value']:
                        if key in output_data and output_data[key]:
                            content = output_data[key]
                            if hasattr(content, 'value'):
                                content = content.value
                            if isinstance(content, str) and content.strip():
                                return content.strip()
                
                # Fallback to string representation
                if isinstance(output_data, str):
                    return output_data.strip()
        
        return None


# Global validator instance
workflow_validator = WorkflowValidator()


def validate_workflow_execution(results: List[Dict[str, Any]], 
                              workflow_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for workflow validation"""
    return workflow_validator.validate_workflow_results(results, workflow_data)


def extract_keywords(input_text: str) -> List[str]:
    """Extract keywords from input text"""
    return workflow_validator.extract_keywords_from_input(input_text)


def calculate_relevance(content: str, input_text: str) -> Tuple[float, List[str], List[str]]:
    """Calculate content relevance"""
    return workflow_validator.calculate_content_relevance(content, input_text) 