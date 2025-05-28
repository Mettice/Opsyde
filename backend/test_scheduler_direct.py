#!/usr/bin/env python3
"""
DIRECT SCHEDULER TEST - No BS, just raw scheduler testing
"""
import sys
import os

# Add the parent directory to path so we can import from backend
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Now import directly without the backend prefix
from backend.frameworks.apscheduler_manager import scheduler_manager
import time

def test_function():
    print("🎉 TEST JOB EXECUTED SUCCESSFULLY!")
    return "success"

def main():
    print("🔧 DIRECT SCHEDULER TEST")
    print("=" * 50)
    
    # 1. Check if scheduler is available
    print(f"1. Scheduler manager: {scheduler_manager}")
    print(f"2. Scheduler instance: {scheduler_manager.scheduler}")
    
    # 2. Start scheduler
    print("3. Starting scheduler...")
    started = scheduler_manager.start()
    print(f"   Started: {started}")
    print(f"   Running: {scheduler_manager.scheduler.running if scheduler_manager.scheduler else 'No scheduler'}")
    
    # 3. Check initial job count
    initial_jobs = scheduler_manager.get_all_jobs()
    print(f"4. Initial jobs: {len(initial_jobs)}")
    
    # 4. Add a simple interval job
    print("5. Adding test job...")
    trigger_data = {
        'triggerType': 'interval',
        'scheduleType': 'interval',
        'runAt': {'seconds': 5},  # Every 5 seconds
        'timezone': 'UTC'
    }
    
    success = scheduler_manager.add_job(
        job_id="test-direct-job",
        func=test_function,
        trigger_data=trigger_data
    )
    
    print(f"   Add job success: {success}")
    
    # 5. Check job count after adding
    after_jobs = scheduler_manager.get_all_jobs()
    print(f"6. Jobs after adding: {len(after_jobs)}")
    
    # 6. List all jobs
    print("7. All jobs:")
    for job in after_jobs:
        print(f"   - {job.id}: {job.next_run_time}")
    
    # 7. Wait and see if job executes
    print("8. Waiting 10 seconds to see if job executes...")
    time.sleep(10)
    
    # 8. Final status
    final_jobs = scheduler_manager.get_all_jobs()
    print(f"9. Final job count: {len(final_jobs)}")
    
    print("=" * 50)
    print("🏁 TEST COMPLETE")

if __name__ == "__main__":
    main() 