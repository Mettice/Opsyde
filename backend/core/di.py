# core/di.py
from typing import Dict, Any, Type, TypeVar, Callable, Optional, Set
import inspect
import functools
import logging
from fastapi import Depends

from .runner import UnifiedRunner

logger = logging.getLogger(__name__)

T = TypeVar('T')

class DependencyInjector:
    """
    Simple dependency injection container
    """
    
    def __init__(self):
        self._services = {}
        self._instances = {}
        self._scoped_instances = {}
        self._factories = {}
        
    def register(self, interface: Type, implementation: Type, singleton: bool = True) -> None:
        """
        Register a service implementation
        
        Args:
            interface: The interface or abstract class
            implementation: The concrete implementation
            singleton: Whether to create a single instance (True) or new instance per request (False)
        """
        self._services[interface] = {
            "implementation": implementation,
            "singleton": singleton
        }
        
        # Clear instance if it exists
        if interface in self._instances:
            del self._instances[interface]
            
        logger.debug(f"Registered service {interface.__name__} -> {implementation.__name__}")
        
    def register_instance(self, interface: Type, instance: Any) -> None:
        """
        Register an existing instance
        
        Args:
            interface: The interface or abstract class
            instance: The instance to register
        """
        self._instances[interface] = instance
        logger.debug(f"Registered instance {interface.__name__}")
        
    def register_factory(self, interface: Type, factory: Callable[[], Any]) -> None:
        """
        Register a factory function
        
        Args:
            interface: The interface or abstract class
            factory: Factory function that creates instances
        """
        self._factories[interface] = factory
        logger.debug(f"Registered factory for {interface.__name__}")
        
    def get(self, interface: Type[T]) -> T:
        """
        Get an instance of the registered service
        
        Args:
            interface: The interface to resolve
            
        Returns:
            An instance of the registered implementation
            
        Raises:
            ValueError: If the service is not registered
        """
        # Check if instance exists
        if interface in self._instances:
            return self._instances[interface]
            
        # Check if factory exists
        if interface in self._factories:
            instance = self._factories[interface]()
            return instance
            
        # Check if service is registered
        if interface not in self._services:
            raise ValueError(f"Service not registered: {interface.__name__}")
            
        service_info = self._services[interface]
        implementation = service_info["implementation"]
        singleton = service_info["singleton"]
        
        # Create instance with dependency injection
        instance = self._create_instance(implementation)
        
        # Store instance if singleton
        if singleton:
            self._instances[interface] = instance
            
        return instance
        
    def create_scoped(self) -> 'ScopedDependencyInjector':
        """Create a scoped injector that inherits registrations"""
        return ScopedDependencyInjector(self)
        
    def _create_instance(self, cls: Type) -> Any:
        """Create an instance with dependencies injected"""
        # Get constructor parameters
        signature = inspect.signature(cls.__init__)
        parameters = signature.parameters
        
        # Skip self parameter
        params = list(parameters.values())[1:]
        
        # Resolve dependencies
        args = []
        for param in params:
            # Get parameter type
            if param.annotation == inspect.Parameter.empty:
                raise ValueError(f"Parameter {param.name} in {cls.__name__}.__init__ has no type annotation")
                
            # Resolve dependency
            dependency_type = param.annotation
            args.append(self.get(dependency_type))
            
        # Create instance
        return cls(*args)
    
    def inject(self, func: Callable) -> Callable:
        """
        Decorator to inject dependencies into a function
        
        Example:
            @injector.inject
            def process_data(data_service: DataService):
                # data_service is automatically injected
                pass
        """
        signature = inspect.signature(func)
        parameters = signature.parameters
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get parameters that need injection
            injected_kwargs = {}
            
            for name, param in parameters.items():
                # Skip if already provided
                if name in kwargs:
                    continue
                    
                # Skip positional arguments
                if len(args) > 0 and list(parameters.keys()).index(name) < len(args):
                    continue
                    
                # Get parameter type
                if param.annotation == inspect.Parameter.empty:
                    continue
                    
                # Resolve dependency
                dependency_type = param.annotation
                try:
                    injected_kwargs[name] = self.get(dependency_type)
                except ValueError:
                    # If dependency not registered, skip it
                    pass
                    
            # Call function with injected dependencies
            return func(*args, **{**kwargs, **injected_kwargs})
            
        return wrapper


class ScopedDependencyInjector:
    """
    Scoped dependency injector for request-scoped services
    """
    
    def __init__(self, parent: DependencyInjector):
        self._parent = parent
        self._instances = {}
        
    def register_instance(self, interface: Type, instance: Any) -> None:
        """Register a scoped instance"""
        self._instances[interface] = instance
        
    def get(self, interface: Type[T]) -> T:
        """Get an instance, first checking scoped instances"""
        # Check scoped instances
        if interface in self._instances:
            return self._instances[interface]
            
        # Fall back to parent
        return self._parent.get(interface)
        
    def dispose(self) -> None:
        """Dispose of all scoped instances"""
        # Call dispose method on instances if available
        for instance in self._instances.values():
            if hasattr(instance, "dispose") and callable(instance.dispose):
                instance.dispose()
                
        self._instances.clear()


# Create global injector
injector = DependencyInjector()

# Create and register UnifiedRunner instance
unified_runner = UnifiedRunner()
injector.register_instance(UnifiedRunner, unified_runner)

# Create and register TriggerService instance
from services.trigger_service import TriggerService
trigger_service = TriggerService()
injector.register_instance(TriggerService, trigger_service)

async def get_unified_runner() -> UnifiedRunner:
    """FastAPI dependency to get UnifiedRunner instance"""
    return injector.get(UnifiedRunner)

async def get_trigger_service() -> TriggerService:
    """FastAPI dependency to get TriggerService instance"""
    return injector.get(TriggerService)