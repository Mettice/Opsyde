import asyncio
import sys
import json
sys.path.append('backend')
from backend.core.runner import UnifiedRunner

async def test_workflow():
    runner = UnifiedRunner()
    workflow_data = json.load(open('dexscreener-workflow-import.json'))
    
    print('🧪 Testing workflow with fixed agent...')
    
    results = []
    async for result in runner.execute_workflow(workflow_data):
        results.append(result)
        node_id = result.get('node_id', 'unknown')
        node_type = result.get('node_type', 'unknown')
        print(f'📊 Node: {node_id} ({node_type})')
        
        # Check agent output specifically
        if node_type == 'agent':
            result_value = result.get('result', {})
            if isinstance(result_value, dict) and 'value' in result_value:
                agent_output = result_value['value'].get('output', '')
            else:
                agent_output = str(result_value)
            
            print(f'🤖 Agent output preview: {agent_output[:300]}...')
            
            # Check for real vs hallucinated data
            if 'PEPE' in agent_output or 'pepe' in agent_output.lower():
                print('✅ SUCCESS: Agent is using real DexScreener data!')
            elif 'Bitcoin' in agent_output and ('$45,000' in agent_output or '$30 billion' in agent_output):
                print('❌ STILL HALLUCINATING: Agent is making up Bitcoin data')
            else:
                print('🔍 UNCLEAR: Check agent output manually')
            break
    
    return results

if __name__ == "__main__":
    asyncio.run(test_workflow()) 