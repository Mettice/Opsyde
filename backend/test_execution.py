import asyncio
import json
import base64
from crew_runner import run_crew

async def test_workflow():
    # Load workflow
    with open('test_workflow.json', 'r') as f:
        workflow = json.load(f)
    
    # Read and encode test PDF
    with open('EfuetngongDion_CV.pdf', 'rb') as f:
        pdf_content = base64.b64encode(f.read()).decode('utf-8')
    
    # Add file data to workflow inputs
    workflow['inputs'] = {
        'cv_file': {
            'file_upload': {
                'filename': 'EfuetngongDion_CV.pdf',
                'content': pdf_content,
                'type': 'application/pdf'
            }
        }
    }
    
    # Execute workflow
    async for result in run_crew(workflow):
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_workflow()) 