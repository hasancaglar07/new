#!/usr/bin/env python3
# Memory monitoring utility for populate_vector_db.py

import psutil
import time
import sys
import os
from datetime import datetime

def get_memory_info():
    """Get current memory usage information"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    memory_percent = process.memory_percent()
    
    # System memory
    system_memory = psutil.virtual_memory()
    
    return {
        'process_memory_mb': memory_info.rss / 1024 / 1024,
        'process_memory_percent': memory_percent,
        'system_memory_percent': system_memory.percent,
        'system_available_mb': system_memory.available / 1024 / 1024,
        'system_total_mb': system_memory.total / 1024 / 1024
    }

def format_memory_info(info):
    """Format memory information for display"""
    return (
        f"Process: {info['process_memory_mb']:.1f}MB ({info['process_memory_percent']:.1f}%) | "
        f"System: {info['system_memory_percent']:.1f}% | "
        f"Available: {info['system_available_mb']:.1f}MB"
    )

def monitor_memory(interval=5, threshold=85):
    """Monitor memory usage and warn if threshold exceeded"""
    print(f"Memory Monitor Started - Warning threshold: {threshold}%")
    print("Time\t\t\tMemory Usage")
    print("-" * 60)
    
    try:
        while True:
            info = get_memory_info()
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            # Color coding for terminal
            if info['system_memory_percent'] > threshold:
                status = "⚠️  HIGH"
            elif info['system_memory_percent'] > 70:
                status = "⚡ MEDIUM"
            else:
                status = "✅ NORMAL"
            
            print(f"{timestamp}\t{format_memory_info(info)} {status}")
            
            # Warning if memory is too high
            if info['system_memory_percent'] > threshold:
                print(f"\n🚨 WARNING: System memory usage is {info['system_memory_percent']:.1f}%!")
                print("Consider stopping the process or reducing batch size.\n")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nMemory monitoring stopped.")

def check_memory_before_start():
    """Check memory before starting populate script"""
    info = get_memory_info()
    
    print("=" * 50)
    print("MEMORY CHECK BEFORE STARTING")
    print("=" * 50)
    print(f"Current system memory usage: {info['system_memory_percent']:.1f}%")
    print(f"Available memory: {info['system_available_mb']:.1f}MB")
    print(f"Total system memory: {info['system_total_mb']:.1f}MB")
    
    if info['system_memory_percent'] > 80:
        print("\n🚨 WARNING: High memory usage detected!")
        print("Recommendations:")
        print("1. Close unnecessary applications")
        print("2. Use smaller batch sizes")
        print("3. Process data in smaller chunks")
        return False
    elif info['system_memory_percent'] > 60:
        print("\n⚠️  CAUTION: Moderate memory usage")
        print("Monitor memory during processing")
        return True
    else:
        print("\n✅ GOOD: Memory usage is normal")
        return True

def get_recommendations():
    """Get memory optimization recommendations"""
    info = get_memory_info()
    
    recommendations = []
    
    if info['system_memory_percent'] > 85:
        recommendations.extend([
            "🔴 CRITICAL: Stop the process immediately",
            "Close all unnecessary applications",
            "Restart the process with --articles-only flag",
            "Use BATCH_SIZE = 25 or smaller"
        ])
    elif info['system_memory_percent'] > 75:
        recommendations.extend([
            "🟡 HIGH: Reduce batch size to 25-30",
            "Close browser and other applications",
            "Monitor memory closely"
        ])
    elif info['system_memory_percent'] > 60:
        recommendations.extend([
            "🟢 MODERATE: Current settings should work",
            "Keep monitoring memory usage"
        ])
    else:
        recommendations.extend([
            "🟢 OPTIMAL: Memory usage is healthy",
            "You can use larger batch sizes if needed"
        ])
    
    return recommendations

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "monitor":
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 5
            threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 85
            monitor_memory(interval, threshold)
        elif sys.argv[1] == "check":
            check_memory_before_start()
        elif sys.argv[1] == "recommend":
            print("\nMemory Optimization Recommendations:")
            print("-" * 40)
            for rec in get_recommendations():
                print(f"• {rec}")
    else:
        print("Memory Monitor Utility")
        print("Usage:")
        print("  python memory_monitor.py check      - Check memory before starting")
        print("  python memory_monitor.py monitor    - Monitor memory usage (5s interval)")
        print("  python memory_monitor.py monitor 10 - Monitor with 10s interval")
        print("  python memory_monitor.py recommend  - Get optimization recommendations")
        print("\nCurrent memory status:")
        info = get_memory_info()
        print(format_memory_info(info))