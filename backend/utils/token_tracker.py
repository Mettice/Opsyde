#!/usr/bin/env python3
"""
🎯 Token Usage Tracker
Monitor and limit token consumption to control costs
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pathlib import Path

class TokenTracker:
    """Track and limit token usage across workflows"""
    
    def __init__(self, max_tokens_per_hour: int = 50000, max_cost_per_hour: float = 5.0):
        self.max_tokens_per_hour = max_tokens_per_hour
        self.max_cost_per_hour = max_cost_per_hour
        self.usage_file = Path("token_usage.json")
        self.load_usage_data()
        
        # Token costs per 1K tokens (approximate)
        self.token_costs = {
            'gpt-4': 0.03,  # $0.03 per 1K tokens
            'gpt-3.5-turbo': 0.002,  # $0.002 per 1K tokens
            'claude-3.5-sonnet': 0.015,  # $0.015 per 1K tokens
        }
    
    def load_usage_data(self):
        """Load existing usage data"""
        if self.usage_file.exists():
            try:
                with open(self.usage_file, 'r') as f:
                    self.usage_data = json.load(f)
            except:
                self.usage_data = {}
        else:
            self.usage_data = {}
    
    def save_usage_data(self):
        """Save usage data to file"""
        try:
            with open(self.usage_file, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            print(f"❌ Failed to save usage data: {e}")
    
    def get_current_hour_key(self) -> str:
        """Get current hour key for tracking"""
        return datetime.now().strftime('%Y-%m-%d-%H')
    
    def clean_old_data(self):
        """Remove data older than 24 hours"""
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(hours=24)
        
        keys_to_remove = []
        for key in self.usage_data.keys():
            try:
                key_time = datetime.strptime(key, '%Y-%m-%d-%H')
                if key_time < cutoff_time:
                    keys_to_remove.append(key)
            except:
                keys_to_remove.append(key)  # Remove invalid keys
        
        for key in keys_to_remove:
            del self.usage_data[key]
    
    def get_hourly_usage(self) -> Dict[str, Any]:
        """Get current hour usage"""
        hour_key = self.get_current_hour_key()
        return self.usage_data.get(hour_key, {
            'total_tokens': 0,
            'total_cost': 0.0,
            'requests': 0,
            'models_used': {}
        })
    
    def can_make_request(self, estimated_tokens: int, model: str = 'gpt-4') -> Dict[str, Any]:
        """Check if request can be made within limits"""
        self.clean_old_data()
        current_usage = self.get_hourly_usage()
        
        # Calculate estimated cost
        cost_per_token = self.token_costs.get(model, 0.03) / 1000
        estimated_cost = estimated_tokens * cost_per_token
        
        # Check limits
        would_exceed_tokens = (current_usage['total_tokens'] + estimated_tokens) > self.max_tokens_per_hour
        would_exceed_cost = (current_usage['total_cost'] + estimated_cost) > self.max_cost_per_hour
        
        return {
            'allowed': not (would_exceed_tokens or would_exceed_cost),
            'current_tokens': current_usage['total_tokens'],
            'estimated_tokens': estimated_tokens,
            'tokens_remaining': max(0, self.max_tokens_per_hour - current_usage['total_tokens']),
            'current_cost': current_usage['total_cost'],
            'estimated_cost': estimated_cost,
            'cost_remaining': max(0, self.max_cost_per_hour - current_usage['total_cost']),
            'would_exceed_tokens': would_exceed_tokens,
            'would_exceed_cost': would_exceed_cost,
            'model': model
        }
    
    def record_usage(self, tokens_used: int, model: str = 'gpt-4', request_type: str = 'completion'):
        """Record token usage"""
        self.clean_old_data()
        hour_key = self.get_current_hour_key()
        
        if hour_key not in self.usage_data:
            self.usage_data[hour_key] = {
                'total_tokens': 0,
                'total_cost': 0.0,
                'requests': 0,
                'models_used': {}
            }
        
        # Calculate cost
        cost_per_token = self.token_costs.get(model, 0.03) / 1000
        cost = tokens_used * cost_per_token
        
        # Update usage
        usage = self.usage_data[hour_key]
        usage['total_tokens'] += tokens_used
        usage['total_cost'] += cost
        usage['requests'] += 1
        
        if model not in usage['models_used']:
            usage['models_used'][model] = {'tokens': 0, 'cost': 0.0, 'requests': 0}
        
        usage['models_used'][model]['tokens'] += tokens_used
        usage['models_used'][model]['cost'] += cost
        usage['models_used'][model]['requests'] += 1
        
        self.save_usage_data()
        
        # Log usage
        print(f"🎯 Token Usage Recorded:")
        print(f"   📊 Tokens: {tokens_used:,}")
        print(f"   💰 Cost: ${cost:.4f}")
        print(f"   🤖 Model: {model}")
        print(f"   📈 Hourly Total: {usage['total_tokens']:,} tokens (${usage['total_cost']:.4f})")
    
    def get_usage_summary(self) -> Dict[str, Any]:
        """Get usage summary for current hour"""
        current_usage = self.get_hourly_usage()
        
        return {
            'current_hour': self.get_current_hour_key(),
            'tokens_used': current_usage['total_tokens'],
            'tokens_limit': self.max_tokens_per_hour,
            'tokens_remaining': max(0, self.max_tokens_per_hour - current_usage['total_tokens']),
            'tokens_percentage': (current_usage['total_tokens'] / self.max_tokens_per_hour) * 100,
            'cost_used': current_usage['total_cost'],
            'cost_limit': self.max_cost_per_hour,
            'cost_remaining': max(0, self.max_cost_per_hour - current_usage['total_cost']),
            'cost_percentage': (current_usage['total_cost'] / self.max_cost_per_hour) * 100,
            'requests_made': current_usage['requests'],
            'models_used': current_usage['models_used']
        }
    
    def print_usage_summary(self):
        """Print a formatted usage summary"""
        summary = self.get_usage_summary()
        
        print(f"\n🎯 Token Usage Summary ({summary['current_hour']})")
        print("=" * 50)
        print(f"📊 Tokens: {summary['tokens_used']:,} / {summary['tokens_limit']:,} ({summary['tokens_percentage']:.1f}%)")
        print(f"💰 Cost: ${summary['cost_used']:.4f} / ${summary['cost_limit']:.2f} ({summary['cost_percentage']:.1f}%)")
        print(f"🔄 Requests: {summary['requests_made']}")
        
        if summary['models_used']:
            print("\n🤖 Models Used:")
            for model, stats in summary['models_used'].items():
                print(f"   {model}: {stats['tokens']:,} tokens (${stats['cost']:.4f}) - {stats['requests']} requests")
        
        # Warnings
        if summary['tokens_percentage'] > 80:
            print(f"\n⚠️  WARNING: High token usage ({summary['tokens_percentage']:.1f}%)")
        if summary['cost_percentage'] > 80:
            print(f"⚠️  WARNING: High cost usage ({summary['cost_percentage']:.1f}%)")

# Global tracker instance
token_tracker = TokenTracker()

def check_token_limit(estimated_tokens: int, model: str = 'gpt-4') -> bool:
    """Quick function to check if request is within limits"""
    result = token_tracker.can_make_request(estimated_tokens, model)
    
    if not result['allowed']:
        print(f"🚫 Request blocked - would exceed limits:")
        if result['would_exceed_tokens']:
            print(f"   📊 Tokens: {result['current_tokens'] + result['estimated_tokens']:,} > {token_tracker.max_tokens_per_hour:,}")
        if result['would_exceed_cost']:
            print(f"   💰 Cost: ${result['current_cost'] + result['estimated_cost']:.4f} > ${token_tracker.max_cost_per_hour:.2f}")
    
    return result['allowed']

def record_token_usage(tokens_used: int, model: str = 'gpt-4'):
    """Quick function to record token usage"""
    token_tracker.record_usage(tokens_used, model)

if __name__ == "__main__":
    # Test the tracker
    tracker = TokenTracker()
    tracker.print_usage_summary()
    
    # Test a request
    print("\n🧪 Testing token limit check...")
    result = tracker.can_make_request(1000, 'gpt-4')
    print(f"Request allowed: {result['allowed']}")
    
    if result['allowed']:
        print("Recording usage...")
        tracker.record_usage(1000, 'gpt-4')
        tracker.print_usage_summary() 