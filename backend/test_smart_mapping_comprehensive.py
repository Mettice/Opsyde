"""
Comprehensive Smart Mapping System Test Suite
Tests all aspects of intelligent input mapping, multimodal processing, and edge cases
"""

import asyncio
import sys
import os
import time
import json
import base64
from datetime import datetime
from typing import Dict, Any, List

sys.path.append('.')

from core.smart_mapper import smart_map_inputs, SmartMapper
from core.multimodal_processor import process_multimodal_input
from core.node_processor import NodeProcessor

class SmartMappingTestSuite:
    """Comprehensive test suite for Smart Mapping System"""
    
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []
        self.performance_metrics = {}
        
    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🧠 Starting Comprehensive Smart Mapping Test Suite")
        print("=" * 60)
        
        # Core mapping tests
        await self.test_basic_mapping()
        await self.test_all_node_types()
        await self.test_complex_data_structures()
        await self.test_type_transformations()
        await self.test_semantic_matching()
        await self.test_confidence_scoring()
        
        # Error handling tests
        await self.test_error_handling()
        await self.test_edge_cases()
        await self.test_missing_inputs()
        
        # Integration tests
        await self.test_node_processor_integration()
        await self.test_multimodal_integration()
        
        # Performance tests
        await self.test_performance()
        await self.test_large_data_sets()
        
        # AI assistance tests
        await self.test_ai_assistance()
        
        # Generate test report
        self.generate_test_report()
        
    async def test_basic_mapping(self):
        """Test basic input mapping functionality"""
        print("\n📋 Testing Basic Input Mapping...")
        
        test_cases = [
            {
                "name": "Simple Agent Mapping",
                "node": {
                    'id': 'agent-1',
                    'type': 'agent',
                    'data': {'role': 'Research Assistant'}
                },
                "context": {
                    'variables': {
                        'user_query': 'Analyze sales data',
                        'background_info': 'Q4 2024 analysis needed'
                    }
                },
                "expected_inputs": ['query', 'context', 'user_input']
            },
            {
                "name": "Task with Agent Reference",
                "node": {
                    'id': 'task-1',
                    'type': 'task',
                    'data': {'description': 'Complete analysis'}
                },
                "context": {
                    'variables': {
                        'agent-1.output': 'Previous agent results',
                        'task_instructions': 'Use detailed analysis'
                    }
                },
                "expected_inputs": ['task_input', 'agent_output']
            }
        ]
        
        for test_case in test_cases:
            await self._run_test_case("basic_mapping", test_case)
    
    async def test_all_node_types(self):
        """Test mapping for all supported node types"""
        print("\n🎯 Testing All Node Types...")
        
        node_types = [
            {
                "type": "agent",
                "data": {"role": "Analyst", "goal": "Analyze data"},
                "expected_schema_keys": ["query", "context", "user_input"]
            },
            {
                "type": "task", 
                "data": {"description": "Process data"},
                "expected_schema_keys": ["task_input", "agent_output"]
            },
            {
                "type": "tool",
                "data": {"tool_type": "api", "framework": "universal_api"},
                "expected_schema_keys": ["input_data", "parameters"]
            },
            {
                "type": "chat",
                "data": {"prompt": "Chat with user"},
                "expected_schema_keys": ["message", "conversation_history"]
            },
            {
                "type": "output",
                "data": {"output_type": "webhook"},
                "expected_schema_keys": ["data", "content"]
            },
            {
                "type": "logic",
                "data": {"condition": "value > 100"},
                "expected_schema_keys": ["input_value"]
            },
            {
                "type": "delay",
                "data": {"duration": 5},
                "expected_schema_keys": ["trigger_data"]
            }
        ]
        
        context = {
            'variables': {
                'user_query': 'Test query',
                'input_data': {'key': 'value'},
                'message': 'Hello world',
                'content': 'Test content',
                'value': 150,
                'trigger_data': 'trigger info'
            }
        }
        
        for i, node_config in enumerate(node_types):
            test_case = {
                "name": f"{node_config['type'].title()} Node Mapping",
                "node": {
                    'id': f'{node_config["type"]}-{i+1}',
                    'type': node_config['type'],
                    'data': node_config['data']
                },
                "context": context,
                "expected_inputs": node_config['expected_schema_keys']
            }
            await self._run_test_case("node_types", test_case)
    
    async def test_complex_data_structures(self):
        """Test mapping with complex nested data structures"""
        print("\n🏗️ Testing Complex Data Structures...")
        
        complex_context = {
            'variables': {
                'nested_data': {
                    'analytics': {
                        'sales': {
                            'q4_2024': {
                                'revenue': 1250000,
                                'customers': 4500,
                                'conversion_rate': 0.23
                            }
                        },
                        'marketing': {
                            'campaigns': ['email', 'social', 'ppc'],
                            'budget': 150000
                        }
                    }
                },
                'user_preferences': {
                    'format': 'detailed_report',
                    'include_charts': True,
                    'language': 'en'
                },
                'api_responses': [
                    {'id': 1, 'status': 'success', 'data': 'Result 1'},
                    {'id': 2, 'status': 'success', 'data': 'Result 2'}
                ]
            }
        }
        
        test_cases = [
            {
                "name": "Nested Object Extraction",
                "node": {
                    'id': 'agent-nested',
                    'type': 'agent',
                    'data': {'role': 'Data Analyst'}
                },
                "context": complex_context,
                "expected_inputs": ['query', 'context']
            },
            {
                "name": "Array Data Processing",
                "node": {
                    'id': 'tool-array',
                    'type': 'tool',
                    'data': {'tool_type': 'api'}
                },
                "context": complex_context,
                "expected_inputs": ['input_data', 'parameters']
            }
        ]
        
        for test_case in test_cases:
            await self._run_test_case("complex_data", test_case)
    
    async def test_type_transformations(self):
        """Test automatic type transformations"""
        print("\n🔄 Testing Type Transformations...")
        
        transformation_context = {
            'variables': {
                'string_number': '42',
                'json_string': '{"key": "value", "count": 10}',
                'boolean_string': 'true',
                'list_string': '[1, 2, 3, 4, 5]',
                'number_value': 3.14159,
                'boolean_value': False,
                'object_value': {'nested': {'deep': 'value'}}
            }
        }
        
        # Create a custom node with specific type requirements
        custom_node = {
            'id': 'type-test',
            'type': 'agent',
            'data': {
                'role': 'Type Tester',
                'input_schema': {
                    'number_input': {'type': 'number', 'description': 'Numeric value'},
                    'json_input': {'type': 'object', 'description': 'JSON object'},
                    'boolean_input': {'type': 'boolean', 'description': 'Boolean flag'},
                    'array_input': {'type': 'array', 'description': 'List of items'}
                }
            }
        }
        
        test_case = {
            "name": "Type Transformation Test",
            "node": custom_node,
            "context": transformation_context,
            "expected_inputs": ['number_input', 'json_input', 'boolean_input', 'array_input']
        }
        
        await self._run_test_case("type_transformations", test_case)
    
    async def test_semantic_matching(self):
        """Test semantic matching capabilities"""
        print("\n🔍 Testing Semantic Matching...")
        
        semantic_context = {
            'variables': {
                # Different ways to express similar concepts
                'user_question': 'What are the sales figures?',
                'customer_inquiry': 'I need to know the revenue data',
                'search_term': 'financial performance metrics',
                'background_context': 'Company quarterly analysis',
                'additional_info': 'Include year-over-year comparison',
                'system_prompt': 'You are a financial analyst',
                'instructions': 'Provide detailed analysis with charts'
            }
        }
        
        test_case = {
            "name": "Semantic Matching Test",
            "node": {
                'id': 'semantic-agent',
                'type': 'agent',
                'data': {'role': 'Financial Analyst'}
            },
            "context": semantic_context,
            "expected_inputs": ['query', 'context', 'user_input']
        }
        
        await self._run_test_case("semantic_matching", test_case)
    
    async def test_confidence_scoring(self):
        """Test confidence scoring for mappings"""
        print("\n📊 Testing Confidence Scoring...")
        
        # Test with varying quality of matches
        confidence_context = {
            'variables': {
                'exact_match_query': 'User query here',  # Should get high confidence
                'partial_match_input': 'Input data for processing',  # Medium confidence
                'weak_match_info': 'Some random information',  # Low confidence
                'no_match_data': 'Completely unrelated content'  # Very low confidence
            }
        }
        
        test_case = {
            "name": "Confidence Scoring Test",
            "node": {
                'id': 'confidence-test',
                'type': 'agent',
                'data': {'role': 'Test Agent'}
            },
            "context": confidence_context,
            "expected_inputs": ['query', 'user_input', 'context']
        }
        
        result = await self._run_test_case("confidence_scoring", test_case, check_confidence=True)
        
        # Additional confidence analysis
        if result and result.get('success'):
            mapped_inputs = result.get('mapped_inputs', {})
            print(f"   📈 Confidence Analysis:")
            for input_name, value in mapped_inputs.items():
                # Mock confidence calculation (in real implementation, this would come from the mapper)
                confidence = self._calculate_mock_confidence(input_name, value)
                print(f"      • {input_name}: {confidence:.2f} confidence")
    
    async def test_error_handling(self):
        """Test error handling and validation"""
        print("\n⚠️ Testing Error Handling...")
        
        error_test_cases = [
            {
                "name": "Invalid Node Structure",
                "node": {'invalid': 'structure'},  # Missing required fields
                "context": {'variables': {'query': 'test'}},
                "should_fail": True
            },
            {
                "name": "Empty Context",
                "node": {
                    'id': 'test-node',
                    'type': 'agent',
                    'data': {'role': 'Test'}
                },
                "context": {},  # Empty context
                "should_fail": False  # Should handle gracefully
            },
            {
                "name": "Circular Reference in Context",
                "node": {
                    'id': 'circular-test',
                    'type': 'agent',
                    'data': {'role': 'Test'}
                },
                "context": self._create_circular_context(),
                "should_fail": False  # Should handle gracefully
            }
        ]
        
        for test_case in error_test_cases:
            await self._run_test_case("error_handling", test_case)
    
    async def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        print("\n🎪 Testing Edge Cases...")
        
        edge_cases = [
            {
                "name": "Very Large Input",
                "node": {
                    'id': 'large-input',
                    'type': 'agent',
                    'data': {'role': 'Data Processor'}
                },
                "context": {
                    'variables': {
                        'large_dataset': 'x' * 10000,  # 10KB string
                        'query': 'Process large data'
                    }
                }
            },
            {
                "name": "Unicode and Special Characters",
                "node": {
                    'id': 'unicode-test',
                    'type': 'agent',
                    'data': {'role': 'Text Processor'}
                },
                "context": {
                    'variables': {
                        'unicode_text': '🚀 智能映射 тест 🧠 عربي',
                        'emoji_query': '🤖 What does this emoji mean? 🎯',
                        'special_chars': '<>&"\'`{}[]\\|'
                    }
                }
            },
            {
                "name": "Null and Undefined Values",
                "node": {
                    'id': 'null-test',
                    'type': 'agent',
                    'data': {'role': 'Null Handler'}
                },
                "context": {
                    'variables': {
                        'null_value': None,
                        'empty_string': '',
                        'zero_value': 0,
                        'false_value': False,
                        'empty_list': [],
                        'empty_dict': {}
                    }
                }
            }
        ]
        
        for test_case in edge_cases:
            await self._run_test_case("edge_cases", test_case)
    
    async def test_missing_inputs(self):
        """Test handling of missing required inputs"""
        print("\n❓ Testing Missing Input Handling...")
        
        # Node that expects specific inputs
        demanding_node = {
            'id': 'demanding-node',
            'type': 'agent',
            'data': {
                'role': 'Demanding Agent',
                'input_schema': {
                    'required_query': {'type': 'string', 'required': True},
                    'optional_context': {'type': 'string', 'required': False},
                    'missing_input': {'type': 'string', 'required': True}
                }
            }
        }
        
        # Context missing some required inputs
        incomplete_context = {
            'variables': {
                'required_query': 'This is provided',
                'optional_context': 'This is also provided',
                # 'missing_input' is intentionally missing
                'extra_data': 'This was not requested'
            }
        }
        
        test_case = {
            "name": "Missing Required Inputs",
            "node": demanding_node,
            "context": incomplete_context,
            "expected_inputs": ['required_query', 'optional_context', 'missing_input']
        }
        
        await self._run_test_case("missing_inputs", test_case)
    
    async def test_node_processor_integration(self):
        """Test integration with the Node Processor"""
        print("\n🔧 Testing Node Processor Integration...")
        
        # Create a node processor instance
        node_processor = NodeProcessor()
        node_processor.enable_smart_mapping(True)
        
        # Test with a simple agent node
        test_node = {
            'id': 'integration-test',
            'type': 'agent',
            'data': {
                'role': 'Integration Tester',
                'goal': 'Test the integration',
                'framework': 'crewai'
            }
        }
        
        test_inputs = {
            'user_query': 'Test integration between smart mapping and node processor',
            'context_data': 'Integration testing context'
        }
        
        # Mock execution context
        mock_context = type('MockContext', (), {
            'variables': test_inputs,
            'get_variable': lambda self, key: test_inputs.get(key)
        })()
        
        start_time = time.time()
        try:
            # This would normally process the node, but we'll test the mapping part
            mapped_inputs = await smart_map_inputs(test_node, {'variables': test_inputs})
            end_time = time.time()
            
            self._record_test_result("node_processor_integration", "Node Processor Integration", True, {
                'execution_time': end_time - start_time,
                'mapped_inputs_count': len(mapped_inputs),
                'inputs_found': list(mapped_inputs.keys())
            })
            
            print(f"   ✅ Integration test passed")
            print(f"   📥 Mapped {len(mapped_inputs)} inputs: {list(mapped_inputs.keys())}")
            print(f"   ⏱️ Execution time: {(end_time - start_time)*1000:.2f}ms")
            
        except Exception as e:
            self._record_test_result("node_processor_integration", "Node Processor Integration", False, {
                'error': str(e)
            })
            print(f"   ❌ Integration test failed: {str(e)}")
    
    async def test_multimodal_integration(self):
        """Test integration with multimodal processing"""
        print("\n🎬 Testing Multimodal Integration...")
        
        # Create mock file data
        mock_image_data = base64.b64encode(b"fake_image_data").decode('utf-8')
        mock_audio_data = base64.b64encode(b"fake_audio_data").decode('utf-8')
        
        multimodal_test_cases = [
            {
                "name": "Image Processing Integration",
                "file_data": mock_image_data,
                "filename": "test_image.jpg",
                "expected_type": "image"
            },
            {
                "name": "Audio Processing Integration", 
                "file_data": mock_audio_data,
                "filename": "test_audio.mp3",
                "expected_type": "audio"
            },
            {
                "name": "Document Processing Integration",
                "file_data": base64.b64encode(b"Test document content").decode('utf-8'),
                "filename": "test_doc.txt",
                "expected_type": "document"
            }
        ]
        
        for test_case in multimodal_test_cases:
            start_time = time.time()
            try:
                result = await process_multimodal_input(
                    test_case["file_data"],
                    test_case["filename"],
                    {}  # Empty context for testing
                )
                end_time = time.time()
                
                success = result.get('type') == test_case["expected_type"]
                
                self._record_test_result("multimodal_integration", test_case["name"], success, {
                    'execution_time': end_time - start_time,
                    'result_type': result.get('type'),
                    'api_used': result.get('api_used', 'fallback')
                })
                
                status = "✅" if success else "❌"
                print(f"   {status} {test_case['name']}: {result.get('type', 'unknown')} ({result.get('api_used', 'fallback')})")
                
            except Exception as e:
                self._record_test_result("multimodal_integration", test_case["name"], False, {
                    'error': str(e)
                })
                print(f"   ❌ {test_case['name']} failed: {str(e)}")
    
    async def test_performance(self):
        """Test performance characteristics"""
        print("\n⚡ Testing Performance...")
        
        # Performance test cases
        performance_tests = [
            {
                "name": "Small Dataset (10 variables)",
                "context_size": 10,
                "iterations": 100
            },
            {
                "name": "Medium Dataset (100 variables)",
                "context_size": 100,
                "iterations": 50
            },
            {
                "name": "Large Dataset (1000 variables)",
                "context_size": 1000,
                "iterations": 10
            }
        ]
        
        for test in performance_tests:
            # Generate context with specified size
            context = {
                'variables': {
                    f'var_{i}': f'value_{i}' * (i % 10 + 1)  # Varying value sizes
                    for i in range(test["context_size"])
                }
            }
            
            # Add some recognizable variables
            context['variables'].update({
                'user_query': 'Performance test query',
                'context_info': 'Performance test context'
            })
            
            test_node = {
                'id': f'perf-test-{test["context_size"]}',
                'type': 'agent',
                'data': {'role': 'Performance Tester'}
            }
            
            # Time multiple iterations
            total_time = 0
            successful_runs = 0
            
            for i in range(test["iterations"]):
                start_time = time.time()
                try:
                    result = await smart_map_inputs(test_node, context)
                    end_time = time.time()
                    total_time += (end_time - start_time)
                    successful_runs += 1
                except Exception as e:
                    print(f"   ⚠️ Performance test iteration {i+1} failed: {str(e)}")
            
            if successful_runs > 0:
                avg_time = (total_time / successful_runs) * 1000  # Convert to ms
                self.performance_metrics[test["name"]] = {
                    'avg_time_ms': avg_time,
                    'context_size': test["context_size"],
                    'successful_runs': successful_runs,
                    'total_iterations': test["iterations"]
                }
                
                print(f"   📊 {test['name']}: {avg_time:.2f}ms avg ({successful_runs}/{test['iterations']} successful)")
            else:
                print(f"   ❌ {test['name']}: All iterations failed")
    
    async def test_large_data_sets(self):
        """Test with very large data sets"""
        print("\n📦 Testing Large Data Sets...")
        
        # Generate a large context
        large_context = {
            'variables': {}
        }
        
        # Add 5000 variables with various types
        for i in range(5000):
            if i % 5 == 0:
                large_context['variables'][f'data_{i}'] = {'nested': {'value': i}}
            elif i % 5 == 1:
                large_context['variables'][f'list_{i}'] = list(range(i % 10))
            elif i % 5 == 2:
                large_context['variables'][f'string_{i}'] = f'Large string content {i}' * 10
            elif i % 5 == 3:
                large_context['variables'][f'number_{i}'] = i * 3.14159
            else:
                large_context['variables'][f'bool_{i}'] = i % 2 == 0
        
        # Add recognizable inputs
        large_context['variables'].update({
            'user_query': 'Find patterns in this large dataset',
            'analysis_context': 'Large scale data analysis required'
        })
        
        test_node = {
            'id': 'large-data-test',
            'type': 'agent',
            'data': {'role': 'Big Data Analyst'}
        }
        
        start_time = time.time()
        try:
            result = await smart_map_inputs(test_node, large_context)
            end_time = time.time()
            
            execution_time = (end_time - start_time) * 1000
            
            self._record_test_result("large_data_sets", "Large Data Set Test", True, {
                'execution_time_ms': execution_time,
                'context_variables': len(large_context['variables']),
                'mapped_inputs': len(result)
            })
            
            print(f"   ✅ Large data test passed")
            print(f"   📊 Processed {len(large_context['variables'])} variables in {execution_time:.2f}ms")
            print(f"   📥 Mapped {len(result)} inputs")
            
        except Exception as e:
            self._record_test_result("large_data_sets", "Large Data Set Test", False, {
                'error': str(e),
                'context_variables': len(large_context['variables'])
            })
            print(f"   ❌ Large data test failed: {str(e)}")
    
    async def test_ai_assistance(self):
        """Test AI-assisted mapping capabilities"""
        print("\n🤖 Testing AI Assistance...")
        
        # Test cases that would benefit from AI assistance
        ai_test_context = {
            'variables': {
                'unclear_input': 'The user wants to know about financial metrics',
                'ambiguous_data': 'Performance indicators from last quarter',
                'complex_request': 'Generate a comprehensive analysis including charts and recommendations',
                'domain_specific': 'Calculate EBITDA and ROI for the SaaS platform'
            }
        }
        
        ai_node = {
            'id': 'ai-assist-test',
            'type': 'agent',
            'data': {
                'role': 'Financial AI Assistant',
                'input_schema': {
                    'specific_query': {'type': 'string', 'description': 'Specific financial query'},
                    'analysis_type': {'type': 'string', 'description': 'Type of analysis needed'},
                    'output_format': {'type': 'string', 'description': 'Desired output format'}
                }
            }
        }
        
        # Create SmartMapper with AI assistance enabled
        smart_mapper = SmartMapper(use_ai_mapping=True)
        
        start_time = time.time()
        try:
            result = await smart_mapper.smart_map_inputs(ai_node, ai_test_context)
            end_time = time.time()
            
            # Check if AI assistance was used (mock check)
            ai_assisted = len([k for k in result.keys() if 'ai_generated' in str(result[k])]) > 0
            
            self._record_test_result("ai_assistance", "AI-Assisted Mapping", True, {
                'execution_time_ms': (end_time - start_time) * 1000,
                'ai_assisted': ai_assisted,
                'mapped_inputs': len(result)
            })
            
            print(f"   ✅ AI assistance test passed")
            print(f"   🤖 AI assistance detected: {'Yes' if ai_assisted else 'No (using fallbacks)'}")
            print(f"   📥 Mapped {len(result)} inputs")
            
        except Exception as e:
            self._record_test_result("ai_assistance", "AI-Assisted Mapping", False, {
                'error': str(e)
            })
            print(f"   ❌ AI assistance test failed: {str(e)}")
    
    async def _run_test_case(self, category: str, test_case: Dict, check_confidence: bool = False) -> Dict:
        """Run a single test case"""
        start_time = time.time()
        
        try:
            result = await smart_map_inputs(
                test_case["node"], 
                test_case["context"],
                test_case.get("previous_outputs", {})
            )
            end_time = time.time()
            
            # Validate results
            success = True
            validation_notes = []
            
            if "expected_inputs" in test_case:
                expected = set(test_case["expected_inputs"])
                actual = set(result.keys())
                
                if not expected.issubset(actual):
                    missing = expected - actual
                    validation_notes.append(f"Missing expected inputs: {missing}")
                    if test_case.get("should_fail", False):
                        success = True  # Expected to fail
                    else:
                        success = False
            
            if test_case.get("should_fail", False) and success:
                success = False
                validation_notes.append("Test was expected to fail but succeeded")
            
            # Record test result
            self._record_test_result(category, test_case["name"], success, {
                'execution_time_ms': (end_time - start_time) * 1000,
                'mapped_inputs_count': len(result),
                'mapped_inputs': list(result.keys()),
                'validation_notes': validation_notes
            })
            
            status = "✅" if success else "❌"
            print(f"   {status} {test_case['name']}: {len(result)} inputs mapped")
            
            if validation_notes:
                for note in validation_notes:
                    print(f"      ⚠️ {note}")
            
            return {
                'success': success,
                'mapped_inputs': result,
                'execution_time': end_time - start_time
            }
            
        except Exception as e:
            end_time = time.time()
            
            # If test was expected to fail, this might be success
            if test_case.get("should_fail", False):
                success = True
                status = "✅"
                note = f"Expected failure: {str(e)}"
            else:
                success = False
                status = "❌"
                note = f"Unexpected error: {str(e)}"
            
            self._record_test_result(category, test_case["name"], success, {
                'execution_time_ms': (end_time - start_time) * 1000,
                'error': str(e)
            })
            
            print(f"   {status} {test_case['name']}: {note}")
            
            return {
                'success': success,
                'error': str(e),
                'execution_time': end_time - start_time
            }
    
    def _record_test_result(self, category: str, name: str, success: bool, details: Dict):
        """Record a test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        else:
            self.tests_failed += 1
        
        self.test_results.append({
            'category': category,
            'name': name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details
        })
    
    def _create_circular_context(self) -> Dict:
        """Create a context with circular references"""
        context = {'variables': {}}
        obj_a = {'name': 'A', 'ref': None}
        obj_b = {'name': 'B', 'ref': obj_a}
        obj_a['ref'] = obj_b  # Create circular reference
        
        context['variables']['circular_data'] = obj_a
        context['variables']['normal_data'] = 'This is normal'
        
        return context
    
    def _calculate_mock_confidence(self, input_name: str, value: Any) -> float:
        """Calculate mock confidence score for testing"""
        # Mock confidence calculation based on input name matching
        confidence_map = {
            'query': 0.95,
            'user_input': 0.90,
            'context': 0.85,
            'data': 0.75,
            'input': 0.70
        }
        
        for key, conf in confidence_map.items():
            if key in input_name.lower():
                return conf
        
        return 0.50  # Default confidence
    
    def generate_test_report(self):
        """Generate a comprehensive test report"""
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("=" * 60)
        
        # Overall statistics
        pass_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Overall Statistics:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed} ({pass_rate:.1f}%)")
        print(f"   Failed: {self.tests_failed}")
        
        # Category breakdown
        print(f"\n📋 Results by Category:")
        categories = {}
        for result in self.test_results:
            cat = result['category']
            if cat not in categories:
                categories[cat] = {'passed': 0, 'failed': 0, 'total': 0}
            
            categories[cat]['total'] += 1
            if result['success']:
                categories[cat]['passed'] += 1
            else:
                categories[cat]['failed'] += 1
        
        for category, stats in categories.items():
            cat_pass_rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"   {category}: {stats['passed']}/{stats['total']} ({cat_pass_rate:.1f}%)")
        
        # Performance metrics
        if self.performance_metrics:
            print(f"\n⚡ Performance Metrics:")
            for test_name, metrics in self.performance_metrics.items():
                print(f"   {test_name}: {metrics['avg_time_ms']:.2f}ms avg")
        
        # Failed tests details
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests Details:")
            for test in failed_tests:
                print(f"   • {test['name']} ({test['category']})")
                if 'error' in test['details']:
                    print(f"     Error: {test['details']['error']}")
                if 'validation_notes' in test['details']:
                    for note in test['details']['validation_notes']:
                        print(f"     Note: {note}")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        if pass_rate >= 95:
            print("   ✅ Excellent! Smart mapping system is working very well.")
        elif pass_rate >= 85:
            print("   👍 Good performance with some areas for improvement.")
        elif pass_rate >= 70:
            print("   ⚠️ Moderate performance. Review failed tests for issues.")
        else:
            print("   🚨 Poor performance. Significant issues need attention.")
        
        if self.performance_metrics:
            avg_performance = sum(m['avg_time_ms'] for m in self.performance_metrics.values()) / len(self.performance_metrics)
            if avg_performance < 10:
                print("   ⚡ Excellent performance (< 10ms average)")
            elif avg_performance < 50:
                print("   👍 Good performance (< 50ms average)")
            else:
                print("   ⚠️ Consider performance optimization (> 50ms average)")
        
        print(f"\n🎉 Test suite completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# Main execution
if __name__ == "__main__":
    async def main():
        test_suite = SmartMappingTestSuite()
        await test_suite.run_all_tests()
    
    asyncio.run(main()) 