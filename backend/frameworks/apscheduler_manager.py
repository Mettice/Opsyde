import logging
import sys
import os

logger = logging.getLogger(__name__)

# Check if apscheduler is available
SCHEDULER_AVAILABLE = False
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.date import DateTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.jobstores.memory import MemoryJobStore
    from apscheduler.executors.pool import ThreadPoolExecutor
    SCHEDULER_AVAILABLE = True
    import pytz
    logger.info("APScheduler loaded successfully")
except ImportError as e:
    logger.error(f"Scheduler manager not available: {str(e)}")
    pytz = None

class SchedulerManager:
    def __init__(self):
        if SCHEDULER_AVAILABLE:
            # Configure job stores and executors
            jobstores = {
                'default': MemoryJobStore()
            }
            executors = {
                'default': ThreadPoolExecutor(20)
            }
            job_defaults = {
                'coalesce': False,
                'max_instances': 3
            }
            
            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone=pytz.UTC if pytz else None
            )
        else:
            self.scheduler = None
        self._initialized = False
    
    def start(self):
        """Start the scheduler if not already running"""
        if not SCHEDULER_AVAILABLE:
            logger.warning("Scheduler not available - skipping scheduler start")
            return False

        if not self.scheduler:
            logger.error("Scheduler instance not available")
            return False

        try:
            if not self.scheduler.running:
                logger.info("Starting APScheduler...")
                self.scheduler.start()
                self._initialized = True
                
                # Verify the scheduler actually started
                if self.scheduler.running:
                    logger.info(f"APScheduler started successfully - Running: {self.scheduler.running}, State: {self.scheduler.state}")
                    return True
                else:
                    logger.error("APScheduler failed to start - still not running")
                    self._initialized = False
                    return False
            else:
                self._initialized = True
                logger.info(f"APScheduler was already running - State: {self.scheduler.state}")
                return True
                
        except Exception as e:
            logger.error(f"Error starting scheduler: {str(e)}")
            self._initialized = False
            return False
    
    def shutdown(self):
        """Shutdown the scheduler gracefully"""
        if not SCHEDULER_AVAILABLE:
            logger.warning("Scheduler not available - skipping scheduler shutdown")
            return

        if self._initialized and self.scheduler:
            try:
                if self.scheduler.running:
                    self.scheduler.shutdown()
                self._initialized = False
                logger.info("APScheduler shut down successfully")
            except Exception as e:
                logger.error(f"Error shutting down scheduler: {str(e)}")
    
    def add_job(self, job_id, func, trigger_data):
        """
        Add a job to the scheduler based on trigger configuration
        
        Args:
            job_id (str): Unique identifier for the job
            func (callable): Function to execute
            trigger_data (dict): Trigger configuration containing:
                - triggerType: Type of trigger (schedule, webhook, etc)
                - scheduleType: Type of schedule (once, daily, weekly, monthly)
                - runAt: When to run the job
                - timezone: Optional timezone (defaults to UTC)
        """
        if not SCHEDULER_AVAILABLE:
            logger.warning(f"Scheduler not available - skipping add_job for {job_id}")
            return False

        if not self.scheduler:
            logger.warning(f"Scheduler instance not available - skipping add_job for {job_id}")
            return False

        # Try to start scheduler if it's not running
        if not self.scheduler.running:
            logger.info(f"Scheduler not running, attempting to start for job {job_id}")
            if not self.start():
                logger.error(f"Failed to start scheduler for job {job_id}")
                return False

        try:
            # Remove any existing job with this ID
            self.remove_job(job_id)
            
            if trigger_data.get('triggerType') != 'schedule':
                logger.warning(f"Non-schedule trigger type received: {trigger_data.get('triggerType')}")
                return False
            
            schedule_type = trigger_data.get('scheduleType', 'once')
            run_at = trigger_data.get('runAt', {})
            timezone = pytz.timezone(trigger_data.get('timezone', 'UTC'))
            
            if schedule_type == 'once':
                # Convert run_at to datetime if it's a string
                if isinstance(run_at, str):
                    from datetime import datetime
                    try:
                        # Try parsing with different formats
                        if 'T' in run_at:
                            # ISO format
                            run_at = datetime.fromisoformat(run_at.replace('Z', '+00:00'))
                        else:
                            # Simple format like "2025-05-27 19:31"
                            run_at = datetime.strptime(run_at, "%Y-%m-%d %H:%M")
                        
                        # Make sure it's timezone aware
                        if run_at.tzinfo is None:
                            run_at = timezone.localize(run_at)
                        
                        logger.info(f"Parsed run_at datetime: {run_at}")
                    except ValueError as e:
                        logger.error(f"Error parsing date string '{run_at}': {str(e)}")
                        return False
                
                trigger = DateTrigger(run_date=run_at, timezone=timezone)
            
            elif schedule_type == 'daily':
                hour = int(run_at.get('hour', 0))
                minute = int(run_at.get('minute', 0))
                trigger = CronTrigger(
                    hour=hour,
                    minute=minute,
                    timezone=timezone
                )
            
            elif schedule_type == 'weekly':
                day_of_week = run_at.get('dayOfWeek', 0)  # 0 = Monday
                hour = int(run_at.get('hour', 0))
                minute = int(run_at.get('minute', 0))
                trigger = CronTrigger(
                    day_of_week=day_of_week,
                    hour=hour,
                    minute=minute,
                    timezone=timezone
                )
            
            elif schedule_type == 'monthly':
                day = int(run_at.get('day', 1))
                hour = int(run_at.get('hour', 0))
                minute = int(run_at.get('minute', 0))
                trigger = CronTrigger(
                    day=day,
                    hour=hour,
                    minute=minute,
                    timezone=timezone
                )
            
            else:
                logger.error(f"Unsupported schedule type: {schedule_type}")
                return False
            
            self.scheduler.add_job(
                func=func,
                trigger=trigger,
                id=job_id,
                name=f"Trigger_{job_id}",
                replace_existing=True,
                misfire_grace_time=None  # Don't execute missed jobs
            )
            logger.info(f"Successfully scheduled job {job_id} with {schedule_type} schedule")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling job {job_id}: {str(e)}")
            return False
    
    def remove_job(self, job_id):
        """Remove a job from the scheduler if it exists"""
        if not SCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning(f"Scheduler not available - skipping remove_job for {job_id}")
            return

        try:
            if self.scheduler.running:
                self.scheduler.remove_job(job_id)
                logger.info(f"Removed job {job_id}")
        except Exception as e:
            logger.debug(f"Job {job_id} not found or could not be removed: {str(e)}")
    
    def get_job(self, job_id):
        """Get job details by ID"""
        if not SCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning(f"Scheduler not available - skipping get_job for {job_id}")
            return None
        return self.scheduler.get_job(job_id)
    
    def get_all_jobs(self):
        """Get all scheduled jobs"""
        if not SCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("Scheduler not available - skipping get_all_jobs")
            return []
        return self.scheduler.get_jobs()

# Create a global instance
scheduler_manager = SchedulerManager() 