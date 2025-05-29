#!/usr/bin/env python3
"""
Manual trigger registration script to fix scheduler issues
"""
import asyncio
import sys
import os

# Add the parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def fix_scheduler():
    """Fix scheduler and register triggers manually"""
    try:
        print("🔧 Starting scheduler fix...")
        
        # Import services
        from backend.services.trigger_service import TriggerService
        from backend.frameworks.apscheduler_manager import scheduler_manager
        
        # Check scheduler status
        print(f"📊 Scheduler available: {scheduler_manager is not None}")
        print(f"📊 Scheduler instance: {scheduler_manager.scheduler is not None}")
        
        if scheduler_manager.scheduler:
            print(f"📊 Scheduler running: {scheduler_manager.scheduler.running}")
            print(f"📊 Scheduler state: {scheduler_manager.scheduler.state}")
        
        # Force restart scheduler
        print("🔄 Restarting scheduler...")
        scheduler_manager.shutdown()
        await asyncio.sleep(1)
        
        # Reset initialization flag
        scheduler_manager._initialized = False
        
        # Start fresh
        started = scheduler_manager.start()
        print(f"✅ Scheduler restart result: {started}")
        
        if started and scheduler_manager.scheduler:
            print(f"✅ Scheduler now running: {scheduler_manager.scheduler.running}")
            
            # Get trigger service
            trigger_service = TriggerService()
            
            # Get all triggers
            triggers = await trigger_service.list_triggers()
            print(f"📋 Found {len(triggers)} triggers to register")
            
            # Register universal polling triggers
            registered = 0
            print(f"🔍 Starting to process {len(triggers)} triggers...")
            
            for i, trigger in enumerate(triggers):
                print(f"🔍 Processing trigger {i+1}/{len(triggers)}: {trigger}")
                trigger_id = trigger.get("trigger_id")
                print(f"🔍 Trigger ID: {trigger_id}")
                
                if trigger_id:
                    try:
                        print(f"🔍 Getting flow for {trigger_id}...")
                        flow = await trigger_service.get_trigger_flow(trigger_id)
                        print(f"🔍 Flow result: {flow is not None}")
                        
                        if flow:
                            # Find trigger nodes
                            trigger_nodes = [n for n in flow.get('nodes', []) if n.get('id') == trigger_id]
                            print(f"🔍 Found {len(trigger_nodes)} trigger nodes")
                            
                            if trigger_nodes:
                                trigger_data = trigger_nodes[0].get('data', {})
                                trigger_type = trigger_data.get('triggerType')
                                
                                print(f"🔍 Found trigger {trigger_id} with type: {trigger_type}")
                                
                                if trigger_type in ['universal_polling', 'schedule']:
                                    print(f"🔄 Registering {trigger_id} ({trigger_type})")
                                    await trigger_service._setup_schedule(trigger_id, trigger_data)
                                    registered += 1
                                    print(f"✅ Registered: {trigger_id}")
                                else:
                                    print(f"⏭️ Skipping {trigger_id} - type {trigger_type} not supported")
                            else:
                                print(f"❌ No trigger node found for {trigger_id}")
                        else:
                            print(f"❌ No flow found for {trigger_id}")
                    except Exception as e:
                        print(f"❌ Failed to register {trigger_id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"❌ No trigger ID found in trigger: {trigger}")
            
            print(f"✅ Successfully registered {registered} triggers")
            
            # Check final status
            jobs = scheduler_manager.get_all_jobs()
            print(f"📊 Final job count: {len(jobs)}")
            for job in jobs:
                print(f"  - {job.id}: {job.next_run_time}")
        else:
            print("❌ Failed to restart scheduler")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_scheduler()) 