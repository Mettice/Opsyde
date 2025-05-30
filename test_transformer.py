import asyncio
import sys
sys.path.append('backend')
from backend.core.data_transformer import data_transformer
import aiohttp

async def test_dexscreener():
    print("🔧 Testing Universal Data Transformer with DexScreener...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get('https://api.dexscreener.com/latest/dex/search?q=PEPE') as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ API Response received")
                    print(f"📊 Raw data keys: {list(data.keys())}")
                    
                    # Test the transformer
                    records = await data_transformer.transform_api_response(data, 'DexScreener')
                    print(f"🔄 Transformed {len(records)} records")
                    
                    if records:
                        first_record = records[0]
                        print(f"📝 First record ID: {first_record.id}")
                        print(f"🏷️ Record type: {first_record.record_type}")
                        print(f"🔗 Source API: {first_record.source_api}")
                        print(f"📋 Field count: {len(first_record.fields)}")
                        print(f"🔍 First 5 fields: {[f.name for f in first_record.fields[:5]]}")
                        
                        # Test agent format conversion
                        agent_data = data_transformer.to_agent_format(records)
                        print(f"🤖 Agent format created with {len(agent_data.get('records', []))} records")
                        print(f"📈 Transformation summary: {agent_data.get('transformation_summary', {})}")
                        
                    else:
                        print("❌ No records transformed")
                else:
                    print(f"❌ API request failed: {response.status}")
                    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_dexscreener()) 