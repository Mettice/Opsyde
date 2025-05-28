import asyncio
import sys
import os
sys.path.append('.')
sys.path.append('..')

# Fix imports for running from backend directory
from services.trigger_service import TriggerService
from frameworks.apscheduler_manager import scheduler_manager

async def test_trigger():
    print("🔍 Testing Universal Polling Trigger...")
    
    # Test singleton behavior
    from frameworks.apscheduler_manager import SchedulerManager
    instance1 = SchedulerManager()
    instance2 = SchedulerManager()
    print(f"🔗 Singleton test: {instance1 is instance2} (should be True)")
    print(f"🔗 Same as global: {instance1 is scheduler_manager} (should be True)")
    
    # Import here to avoid circular imports
    from frameworks.trigger_storage import get_trigger_flow
    
    # Test 1: Check if trigger exists
    trigger_flow = await get_trigger_flow('test-universal-polling')
    if not trigger_flow:
        print("❌ Trigger 'test-universal-polling' not found")
        return
    
    print("✅ Trigger found!")
    print(f"📋 Trigger flow keys: {list(trigger_flow.keys())}")
    
    # Test 2: Find trigger node
    trigger_nodes = [n for n in trigger_flow.get('nodes', []) if n.get('id') == 'test-universal-polling']
    if not trigger_nodes:
        print("❌ No trigger node found in flow")
        print(f"Available nodes: {[n.get('id') for n in trigger_flow.get('nodes', [])]}")
        return
    
    trigger_data = trigger_nodes[0].get('data', {})
    print(f"📋 Trigger data: {trigger_data}")
    
    # Test 3: Try to setup scheduling
    try:
        # Create service instance (TriggerService already imported at top)
        service = TriggerService()
        await service._setup_schedule('test-universal-polling', trigger_data)
        print("✅ Schedule setup successful!")
        
        # Test 4: Check scheduler status using the SAME instance
        print(f"🔍 Scheduler instance ID: {id(scheduler_manager.scheduler)}")
        print(f"🔍 Global scheduler ID: {id(scheduler_manager)}")
        
        # Check if the service is using a different scheduler
        from frameworks.apscheduler_manager import scheduler_manager as service_scheduler
        print(f"🔍 Service scheduler ID: {id(service_scheduler)}")
        print(f"🔍 Service scheduler.scheduler ID: {id(service_scheduler.scheduler)}")
        
        print(f"🔄 Scheduler running: {scheduler_manager.scheduler.running}")
        print(f"📊 Scheduler state: {scheduler_manager.scheduler.state}")
        
        # Get jobs from the same scheduler instance
        jobs = scheduler_manager.scheduler.get_jobs()
        print(f"📊 Scheduler has {len(jobs)} jobs")
        
        # Also check the service scheduler
        service_jobs = service_scheduler.scheduler.get_jobs()
        print(f"📊 Service scheduler has {len(service_jobs)} jobs")
        
        for job in jobs:
            print(f"  - Job: {job.id} | Next run: {job.next_run_time}")
            
        for job in service_jobs:
            print(f"  - Service Job: {job.id} | Next run: {job.next_run_time}")
            
        # Also check the job store directly
        job_store = scheduler_manager.scheduler._jobstores['default']
        stored_jobs = job_store.get_all_jobs()
        print(f"📦 Job store has {len(stored_jobs)} stored jobs")
        
        service_job_store = service_scheduler.scheduler._jobstores['default']
        service_stored_jobs = service_job_store.get_all_jobs()
        print(f"📦 Service job store has {len(service_stored_jobs)} stored jobs")
        
        for job in stored_jobs:
            print(f"  - Stored Job: {job.id}")
            
        for job in service_stored_jobs:
            print(f"  - Service Stored Job: {job.id}")
        
    except Exception as e:
        print(f"❌ Schedule setup failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_trigger()) 