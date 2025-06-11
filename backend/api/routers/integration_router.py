"""
Integration Router
FastAPI router for the modular integration system
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/stats")
async def get_integration_stats():
    """Get integration system statistics and available platforms"""
    try:
        from frameworks.integration_manager import integration_manager
        
        stats = integration_manager.get_integration_stats()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": stats,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting integration stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_integration_categories():
    """Get all supported integration categories"""
    try:
        from frameworks.integration_manager import integration_manager
        
        categories = integration_manager.get_supported_categories()
        category_info = integration_manager.get_category_info()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "categories": categories,
                    "category_info": category_info
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/platforms")
async def get_integration_platforms(category: Optional[str] = None):
    """Get supported platforms, optionally filtered by category"""
    try:
        from frameworks.integration_manager import integration_manager
        
        platforms = integration_manager.get_supported_platforms(category)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "platforms": platforms,
                    "category_filter": category
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting platforms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-connection")
async def test_platform_connection(request_data: Dict[str, Any]):
    """Test connection to a specific platform"""
    try:
        from frameworks.integration_manager import integration_manager
        
        category = request_data.get("category")
        platform = request_data.get("platform")
        auth_config = request_data.get("auth_config", {})
        
        if not category or not platform:
            raise HTTPException(status_code=400, detail="Category and platform are required")
        
        result = await integration_manager.test_platform_connection(category, platform, auth_config)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@router.post("/execute")
async def execute_integration(inputs: Dict[str, Any]):
    """Execute an integration with the provided inputs"""
    try:
        from frameworks.integration_manager import integration_manager
        
        result = await integration_manager.execute_integration(inputs)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error executing integration: {str(e)}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/documentation/{category}/{platform}")
async def get_platform_documentation(category: str, platform: str):
    """Get documentation for a specific platform integration"""
    try:
        from frameworks.integration_manager import integration_manager
        
        documentation = integration_manager.get_platform_documentation(category, platform)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": documentation,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting documentation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def integration_health_check():
    """Health check for the integration system"""
    try:
        from frameworks.integration_manager import integration_manager
        
        stats = integration_manager.get_integration_stats()
        
        health_status = {
            "status": "healthy",
            "categories_loaded": stats.get("total_categories", 0),
            "platforms_loaded": stats.get("total_platforms", 0),
            "system_operational": True,
            "timestamp": datetime.now().isoformat()
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": health_status
            }
        )
        
    except Exception as e:
        logger.error(f"Integration health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "data": {
                    "status": "unhealthy",
                    "system_operational": False,
                    "timestamp": datetime.now().isoformat()
                }
            }
        )

@router.post("/send-message")
async def send_unified_message(request_data: Dict[str, Any]):
    """Send a message through any communication platform"""
    try:
        from frameworks.integration_manager import integration_manager
        
        platform = request_data.get("platform")
        channel_id = request_data.get("channel_id")
        message = request_data.get("message")
        
        if not all([platform, channel_id, message]):
            raise HTTPException(status_code=400, detail="Platform, channel_id, and message are required")
        
        result = await integration_manager.send_unified_message(
            platform=platform,
            channel_id=channel_id,
            message=message,
            **request_data.get("extra_params", {})
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

# Advanced integration endpoints

@router.get("/categories/{category}/platforms")
async def get_category_platforms(category: str):
    """Get all platforms for a specific category with detailed info"""
    try:
        from frameworks.integration_manager import integration_manager
        
        if category not in integration_manager.get_supported_categories():
            raise HTTPException(status_code=404, detail=f"Category '{category}' not found")
        
        category_info = integration_manager.get_category_info(category)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "category": category,
                    "info": category_info
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting category platforms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-execute")
async def batch_execute_integrations(request_data: Dict[str, Any]):
    """Execute multiple integrations in batch"""
    try:
        from frameworks.integration_manager import integration_manager
        
        integrations = request_data.get("integrations", [])
        
        if not integrations:
            raise HTTPException(status_code=400, detail="No integrations provided")
        
        results = []
        for integration_data in integrations:
            try:
                result = await integration_manager.execute_integration(integration_data)
                results.append({
                    "success": True,
                    "data": result,
                    "integration": integration_data.get("platform", "unknown")
                })
            except Exception as e:
                results.append({
                    "success": False,
                    "error": str(e),
                    "integration": integration_data.get("platform", "unknown")
                })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "results": results,
                    "total_executed": len(results),
                    "successful": len([r for r in results if r["success"]]),
                    "failed": len([r for r in results if not r["success"]])
                },
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error in batch execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-status")
async def get_system_status():
    """Get comprehensive system status and metrics"""
    try:
        from frameworks.integration_manager import integration_manager
        
        stats = integration_manager.get_integration_stats()
        categories = integration_manager.get_supported_categories()
        
        status = {
            "system_health": "operational",
            "total_categories": len(categories),
            "total_platforms": stats.get("total_platforms", 0),
            "categories": categories,
            "last_check": datetime.now().isoformat(),
            "integration_runners_loaded": len(integration_manager.category_runners),
            "statistics": stats
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": status,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        ) 