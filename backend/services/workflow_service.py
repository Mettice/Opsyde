# services/workflow_service.py
from typing import List, Dict, Any, Optional, Type
import logging
from uuid import uuid4
from datetime import datetime
import json

from models.workflow import Workflow
from core.runner import UnifiedRunner
from utils.logging import get_logger
from repositories.workflow_repository import WorkflowRepository
from core.engine import WorkflowEngine
from core.di import injector

logger = logging.getLogger(__name__)

class WorkflowService:
    """
    Service for workflow operations
    """
    
    def __init__(self, repository: WorkflowRepository = None, engine: WorkflowEngine = None):
        self.repository = repository or injector.get(WorkflowRepository)
        self.engine = engine or injector.get(WorkflowEngine)
        
    async def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID, ensuring input/output schemas are included in node dicts"""
        workflow = await self.repository.get_by_id(workflow_id)
        if not workflow:
            return None
        # Serialize nodes with input/output schemas
        nodes_with_schemas = []
        for node in workflow.nodes:
            node_dict = node.dict()
            try:
                config = node.get_config()
                # Add input_schema/output_schema if present
                if hasattr(config, 'input_schema'):
                    node_dict['input_schema'] = config.input_schema
                if hasattr(config, 'output_schema'):
                    node_dict['output_schema'] = config.output_schema
            except Exception:
                pass
            nodes_with_schemas.append(node_dict)
        # Return workflow dict with updated nodes
        wf_dict = workflow.dict()
        wf_dict['nodes'] = nodes_with_schemas
        return Workflow(**wf_dict)
        
    async def get_all_workflows(self) -> List[Workflow]:
        """Get all workflows"""
        return await self.repository.get_all()
        
    async def create_workflow(self, workflow_data: Dict[str, Any]) -> Workflow:
        """Create a new workflow"""
        # Generate ID if not provided
        if "id" not in workflow_data:
            workflow_data["id"] = str(uuid4())
            
        # Add creation timestamp
        workflow_data["created_at"] = datetime.now().isoformat()
        
        # Create workflow model
        workflow = Workflow(**workflow_data)
        
        # Save to repository
        saved_workflow = await self.repository.create(workflow)
        
        logger.info(f"Created workflow {saved_workflow.id}")
        return saved_workflow
        
    async def update_workflow(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Optional[Workflow]:
        """Update a workflow"""
        # Add update timestamp
        workflow_data["updated_at"] = datetime.now().isoformat()
        
        # Update in repository
        updated = await self.repository.update(workflow_id, workflow_data)
        
        if updated:
            logger.info(f"Updated workflow {workflow_id}")
            
        return updated
        
    async def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow"""
        result = await self.repository.delete(workflow_id)
        
        if result:
            logger.info(f"Deleted workflow {workflow_id}")
            
        return result
        
    async def execute_workflow(self, workflow_id: str, inputs: Dict[str, Any] = None):
        """Execute a workflow by ID"""
        # Get workflow
        workflow = await self.repository.get_by_id(workflow_id)
        
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_id}")
            
        # Execute workflow
        return self.engine.execute_workflow(workflow, inputs or {})
        
    async def validate_workflow(self, workflow: Workflow) -> Dict[str, Any]:
        """Validate a workflow configuration"""
        issues = []
        
        # Check for empty nodes
        if not workflow.nodes:
            issues.append("Workflow has no nodes")
            
        # Check for disconnected nodes
        if workflow.nodes and workflow.edges:
            # Find nodes with no connections
            node_ids = {node.id for node in workflow.nodes}
            connected_nodes = set()
            
            for edge in workflow.edges:
                connected_nodes.add(edge.source)
                connected_nodes.add(edge.target)
                
            disconnected = node_ids - connected_nodes
            
            if disconnected:
                issues.append(f"Disconnected nodes: {', '.join(disconnected)}")
                
        # Check for cycles
        try:
            from core.graph import determine_execution_order
            determine_execution_order(workflow.nodes, workflow.edges)
        except ValueError as e:
            issues.append(f"Invalid workflow structure: {str(e)}")
            
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }

    async def get_workflows_by_owner(self, owner_id: str) -> List[Workflow]:
        """Get all workflows for a specific owner"""
        return await self.repository.get_by_owner(owner_id)

    async def export_workflow(self, workflow_id: str, export_type: str = "enterprise_package") -> Dict[str, Any]:
        """
        Export workflow for deployment
        Supports multiple export types for different business models
        """
        # Get workflow
        workflow = await self.repository.get_by_id(workflow_id)
        
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_id}")
        
        export_data = {
            "workflow_id": workflow_id,
            "name": workflow.config.name if workflow.config else "Unnamed Workflow",
            "version": workflow.config.version if workflow.config else "1.0",
            "nodes": [node.dict() for node in workflow.nodes],
            "edges": [edge.dict() for edge in workflow.edges],
            "metadata": {
                "exported_at": datetime.now().isoformat(),
                "export_type": export_type,
                "generator": "CrewBuilder Enterprise",
                "business_model": "saas_with_deployment"
            }
        }
        
        # Add export-type specific data
        if export_type == "enterprise_package":
            export_data["deployment"] = self._generate_deployment_config(workflow)
            export_data["infrastructure"] = self._generate_infrastructure_config(workflow)
            export_data["security"] = self._generate_security_config(workflow)
            export_data["professional_services"] = self._generate_services_package(workflow)
        elif export_type == "docker_compose":
            export_data["docker_config"] = self._generate_docker_config(workflow)
        elif export_type == "kubernetes":
            export_data["k8s_manifests"] = self._generate_k8s_config(workflow)
        
        logger.info(f"Exported workflow {workflow_id} as {export_type}")
        return export_data

    def _generate_deployment_config(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate deployment configuration for enterprise package"""
        
        # Analyze workflow to determine infrastructure needs
        has_llm = any(node.type == "agent" for node in workflow.nodes)
        has_vector_db = any("chroma" in str(node.data or {}).lower() or "vector" in str(node.data or {}).lower() for node in workflow.nodes)
        has_triggers = any(node.type == "trigger" for node in workflow.nodes)
        
        return {
            "infrastructure_requirements": {
                "llm_required": has_llm,
                "vector_db_required": has_vector_db,
                "polling_service_required": has_triggers,
                "estimated_cost": self._calculate_deployment_cost(workflow),
                "recommended_hardware": self._get_hardware_recommendations(workflow)
            },
            "deployment_options": [
                {
                    "type": "docker_compose",
                    "complexity": "medium",
                    "setup_time": "2-4 hours",
                    "suitable_for": "development, small teams"
                },
                {
                    "type": "kubernetes",
                    "complexity": "high", 
                    "setup_time": "1-2 days",
                    "suitable_for": "enterprise, high availability"
                },
                {
                    "type": "professional_services",
                    "complexity": "managed",
                    "setup_time": "2-3 weeks",
                    "suitable_for": "enterprise, compliance-focused"
                }
            ],
            "compliance_features": self._get_compliance_features(workflow)
        }

    def _generate_infrastructure_config(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate infrastructure configuration templates"""
        
        services = []
        
        # Check for LLM requirements
        if any(node.type == "agent" for node in workflow.nodes):
            services.append({
                "name": "llm-service",
                "type": "ollama",
                "model": "llama3:70b",
                "gpu_required": True,
                "memory": "32GB",
                "ports": ["11434:11434"]
            })
        
        # Check for vector database
        if any("chroma" in str(node.data or {}).lower() for node in workflow.nodes):
            services.append({
                "name": "chromadb",
                "type": "chromadb/chroma",
                "ports": ["8000:8000"],
                "volumes": ["./data/chromadb:/chroma/chroma"],
                "environment": ["ANONYMIZED_TELEMETRY=False"]
            })
        
        # Check for document processing
        if any("document" in str(node.data or {}).lower() or "pdf" in str(node.data or {}).lower() for node in workflow.nodes):
            services.append({
                "name": "document-processor",
                "type": "unstructured-io/unstructured-api",
                "ports": ["8000:8000"]
            })
        
        # Add monitoring
        services.extend([
            {
                "name": "prometheus",
                "type": "prom/prometheus",
                "ports": ["9090:9090"],
                "volumes": ["./config/prometheus.yml:/etc/prometheus/prometheus.yml"]
            },
            {
                "name": "grafana", 
                "type": "grafana/grafana",
                "ports": ["3000:3000"],
                "environment": ["GF_SECURITY_ADMIN_PASSWORD=admin"]
            }
        ])
        
        return {
            "services": services,
            "networks": ["crewbuilder-network"],
            "volumes": ["chromadb-data", "llm-models", "app-logs"]
        }

    def _generate_security_config(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate security configuration for enterprise deployment"""
        
        return {
            "authentication": {
                "type": "jwt",
                "secret_key": "${JWT_SECRET_KEY}",
                "expiration": "24h",
                "refresh_enabled": True
            },
            "ssl_config": {
                "enabled": True,
                "cert_path": "/etc/ssl/certs/crewbuilder.crt",
                "key_path": "/etc/ssl/private/crewbuilder.key",
                "force_https": True
            },
            "network_security": {
                "firewall_rules": [
                    "allow 443/tcp",
                    "allow 80/tcp", 
                    "deny all"
                ],
                "internal_network": "10.0.0.0/16",
                "vpn_required": True
            },
            "data_encryption": {
                "at_rest": True,
                "in_transit": True,
                "key_management": "customer_managed"
            },
            "audit_logging": {
                "enabled": True,
                "retention_days": 2555,  # 7 years for legal compliance
                "log_level": "INFO",
                "compliance_mode": True
            },
            "compliance_frameworks": ["SOC2", "GDPR", "HIPAA", "ISO27001"]
        }

    def _generate_services_package(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate professional services package pricing and scope"""
        
        complexity = self._calculate_complexity(workflow)
        base_price = 25000  # Base implementation price
        
        # Calculate pricing based on complexity
        if complexity["score"] > 80:
            implementation_price = f"${base_price + 40000} - ${base_price + 65000}"
            timeline = "3-4 weeks"
        elif complexity["score"] > 60:
            implementation_price = f"${base_price + 20000} - ${base_price + 35000}"
            timeline = "2-3 weeks"
        else:
            implementation_price = f"${base_price} - ${base_price + 20000}"
            timeline = "1-2 weeks"
        
        return {
            "implementation_package": {
                "price": implementation_price,
                "timeline": timeline,
                "includes": [
                    "Infrastructure setup and optimization",
                    "LLM deployment and fine-tuning",
                    "Security hardening and compliance setup",
                    "Staff training (8 hours)",
                    "Documentation and runbooks",
                    "30-day post-deployment support"
                ],
                "complexity_analysis": complexity
            },
            "ongoing_support": {
                "price": "$2,500 - $5,000/month",
                "includes": [
                    "Infrastructure monitoring and maintenance",
                    "LLM model updates and optimization",
                    "Security patches and updates",
                    "Performance optimization",
                    "Technical support (business hours)",
                    "Backup management and disaster recovery"
                ]
            },
            "roi_projection": self._calculate_roi_projection(workflow)
        }

    def _calculate_complexity(self, workflow: Workflow) -> Dict[str, Any]:
        """Calculate workflow complexity for pricing"""
        
        score = 0
        factors = []
        
        # Node count factor
        node_count = len(workflow.nodes)
        if node_count > 15:
            score += 30
            factors.append(f"High node count ({node_count})")
        elif node_count > 8:
            score += 15
            factors.append(f"Medium node count ({node_count})")
        
        # Node type complexity
        complex_nodes = sum(1 for node in workflow.nodes if node.type in ["agent", "tool", "logic"])
        score += complex_nodes * 5
        
        # LLM complexity
        if any(node.type == "agent" for node in workflow.nodes):
            score += 20
            factors.append("LLM integration required")
        
        # Vector DB complexity
        if any("vector" in str(node.data or {}).lower() for node in workflow.nodes):
            score += 15
            factors.append("Vector database integration")
        
        # Compliance requirements
        if "legal" in str(workflow.config.name).lower() or "compliance" in str(workflow.config.description or "").lower():
            score += 25
            factors.append("High compliance requirements")
        
        return {
            "score": min(score, 100),
            "level": "High" if score > 70 else "Medium" if score > 40 else "Low",
            "factors": factors
        }

    def _calculate_deployment_cost(self, workflow: Workflow) -> Dict[str, Any]:
        """Calculate estimated deployment costs"""
        
        monthly_cost = 0
        cost_breakdown = []
        
        # Infrastructure costs
        if any(node.type == "agent" for node in workflow.nodes):
            monthly_cost += 2000  # GPU instance for LLM
            cost_breakdown.append("LLM hosting (GPU): $2,000/month")
        
        if any("chroma" in str(node.data or {}).lower() for node in workflow.nodes):
            monthly_cost += 300  # Vector database
            cost_breakdown.append("Vector database: $300/month")
        
        # Base infrastructure
        monthly_cost += 500  # Base compute, networking, monitoring
        cost_breakdown.append("Base infrastructure: $500/month")
        
        return {
            "monthly_operational": f"${monthly_cost:,}",
            "annual_operational": f"${monthly_cost * 12:,}",
            "breakdown": cost_breakdown,
            "scaling_factor": "Costs scale with usage and data volume"
        }

    def _get_hardware_recommendations(self, workflow: Workflow) -> Dict[str, Any]:
        """Get hardware recommendations based on workflow"""
        
        if any(node.type == "agent" for node in workflow.nodes):
            return {
                "gpu": "2x A100 80GB or 4x RTX 4090",
                "cpu": "32+ cores (AMD EPYC or Intel Xeon)",
                "memory": "256GB DDR4",
                "storage": "4TB NVMe SSD",
                "network": "10Gbps minimum"
            }
        else:
            return {
                "gpu": "Not required",
                "cpu": "16+ cores",
                "memory": "64GB DDR4", 
                "storage": "1TB SSD",
                "network": "1Gbps"
            }

    def _get_compliance_features(self, workflow: 'Workflow') -> List[str]:
        """Determine compliance features needed based on workflow type"""
        features = ["audit_logging", "data_encryption"]
        
        # Analyze workflow name and nodes for compliance needs
        workflow_name = workflow.config.name if workflow.config and workflow.config.name else ""
        if "legal" in str(workflow_name).lower() or "health" in str(workflow_name).lower():
            features.extend(["gdpr_compliance", "hipaa_compliance", "data_retention"])
        
        # Check nodes for sensitive data processing
        for node in workflow.nodes:
            node_data = node.data or {}
            node_type = str(node.type).lower()
            
            if any(keyword in str(node_data).lower() for keyword in ["personal", "medical", "financial", "legal"]):
                features.extend(["data_classification", "access_controls"])
                break
                
        return list(set(features))  # Remove duplicates

    def _calculate_roi_projection(self, workflow: Workflow) -> Dict[str, Any]:
        """Calculate ROI projection for the workflow"""
        
        # Base ROI calculation
        if "legal" in str(workflow.config.name).lower():
            return {
                "time_savings": "40 hours/week",
                "cost_savings": "$6,000/week ($312,000/year)",
                "efficiency_gain": "400%",
                "payback_period": "2-4 months",
                "3_year_roi": "850%"
            }
        else:
            return {
                "time_savings": "20 hours/week", 
                "cost_savings": "$3,000/week ($156,000/year)",
                "efficiency_gain": "200%",
                "payback_period": "4-6 months",
                "3_year_roi": "425%"
            }

    def _generate_docker_config(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate Docker Compose configuration"""
        # Implementation for Docker-specific export
        pass

    def _generate_k8s_config(self, workflow: Workflow) -> Dict[str, Any]:
        """Generate Kubernetes configuration"""
        return {
            "todo": "Kubernetes configuration generation"
        }

# Dependency injection function
def get_workflow_service() -> WorkflowService:
    """Get workflow service instance for dependency injection"""
    return WorkflowService()

# Register the service
workflow_service = WorkflowService()
injector.register_instance(WorkflowService, workflow_service)