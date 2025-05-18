import logging
from typing import Any, Dict, Union, Optional
import operator
from datetime import datetime
import re
import ast
import json

logger = logging.getLogger(__name__)

class ExpressionEvaluator:
    """Safe expression evaluator for workflow conditions"""
    
    # Allowed operators and their corresponding functions
    OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Lt: operator.lt,
        ast.LtE: operator.le,
        ast.Gt: operator.gt,
        ast.GtE: operator.ge,
        ast.And: lambda x, y: x and y,
        ast.Or: lambda x, y: x or y,
        ast.Not: operator.not_,
        ast.In: lambda x, y: x in y,
        ast.NotIn: lambda x, y: x not in y
    }
    
    def __init__(self):
        self.context = {}
    
    def evaluate(self, expression: str, context: Dict[str, Any] = None) -> Any:
        """Safely evaluate an expression with given context"""
        try:
            if context:
                self.context.update(context)
                
            # Parse expression into AST
            tree = ast.parse(expression, mode='eval')
            
            # Evaluate AST
            result = self._eval_node(tree.body)
            
            return {
                "success": True,
                "result": result,
                "expression": expression
            }
            
        except Exception as e:
            logger.error(f"Expression evaluation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "expression": expression
            }
            
    def _eval_node(self, node: ast.AST) -> Any:
        """Recursively evaluate an AST node"""
        
        # Handle literals
        if isinstance(node, ast.Num):
            return node.n
        elif isinstance(node, ast.Str):
            return node.s
        elif isinstance(node, ast.NameConstant):
            return node.value
        elif isinstance(node, ast.List):
            return [self._eval_node(item) for item in node.elts]
        elif isinstance(node, ast.Dict):
            return {
                self._eval_node(key): self._eval_node(value)
                for key, value in zip(node.keys, node.values)
            }
            
        # Handle operations
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            
            if type(node.op) not in self.OPERATORS:
                raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
                
            return self.OPERATORS[type(node.op)](left, right)
            
        # Handle comparisons
        elif isinstance(node, ast.Compare):
            left = self._eval_node(node.left)
            
            for op, comp in zip(node.ops, node.comparators):
                if type(op) not in self.OPERATORS:
                    raise ValueError(f"Unsupported comparison operator: {type(op).__name__}")
                    
                right = self._eval_node(comp)
                if not self.OPERATORS[type(op)](left, right):
                    return False
                left = right
            return True
            
        # Handle boolean operations
        elif isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(self._eval_node(value) for value in node.values)
            elif isinstance(node.op, ast.Or):
                return any(self._eval_node(value) for value in node.values)
            raise ValueError(f"Unsupported boolean operator: {type(node.op).__name__}")
            
        # Handle unary operations
        elif isinstance(node, ast.UnaryOp):
            if type(node.op) not in self.OPERATORS:
                raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")
                
            return self.OPERATORS[type(node.op)](self._eval_node(node.operand))
            
        # Handle attribute access (e.g., inputs.value)
        elif isinstance(node, ast.Attribute):
            obj = self._eval_node(node.value)
            if not hasattr(obj, node.attr):
                raise AttributeError(f"Object has no attribute '{node.attr}'")
            return getattr(obj, node.attr)
            
        # Handle variable names
        elif isinstance(node, ast.Name):
            if node.id not in self.context:
                raise NameError(f"Name '{node.id}' is not defined")
            return self.context[node.id]
            
        # Handle subscript access (e.g., inputs["key"])
        elif isinstance(node, ast.Subscript):
            container = self._eval_node(node.value)
            if isinstance(node.slice, ast.Index):
                key = self._eval_node(node.slice.value)
            else:
                key = self._eval_node(node.slice)
            return container[key]
            
        raise ValueError(f"Unsupported AST node type: {type(node).__name__}")

class ConditionEvaluator:
    """Evaluates workflow conditions with support for complex expressions"""
    
    def __init__(self):
        self.evaluator = ExpressionEvaluator()
        
    def evaluate_condition(self, condition: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a condition with given inputs"""
        try:
            # Prepare context with inputs
            context = {
                "inputs": inputs,
                "env": dict(os.environ),
                "datetime": datetime,
                "len": len,
                "str": str,
                "int": int,
                "float": float,
                "bool": bool,
                "list": list,
                "dict": dict
            }
            
            result = self.evaluator.evaluate(condition, context)
            
            if not result["success"]:
                return {
                    "success": False,
                    "error": result["error"],
                    "condition": condition
                }
                
            return {
                "success": True,
                "result": bool(result["result"]),
                "condition": condition
            }
            
        except Exception as e:
            logger.error(f"Condition evaluation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "condition": condition
            }
            
    def validate_condition(self, condition: str) -> bool:
        """Validate if a condition string is syntactically correct"""
        try:
            ast.parse(condition, mode='eval')
            return True
        except SyntaxError:
            return False

# Create global evaluators
expression_evaluator = ExpressionEvaluator()
condition_evaluator = ConditionEvaluator()

# Example usage:
# result = condition_evaluator.evaluate_condition(
#     "inputs.score > 80 and 'error' not in inputs.status",
#     {"score": 85, "status": "success"}
# )
