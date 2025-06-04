import React from 'react';
import AgentCard from '../components/AgentCard';
import InputNode from '../components/InputNode';
import OutputNode from '../components/OutputNode';
import TaskNode from '../components/TaskNode';

// Lazy load heavier components
const ToolNode = React.lazy(() => import('../components/ToolNode'));
const ChatNode = React.lazy(() => import('../components/ChatNode'));
const DelayNode = React.lazy(() => import('../components/DelayNode'));
const TriggerNode = React.lazy(() => import('../components/TriggerNode'));
const LogicNode = React.lazy(() => import('../components/LogicNode'));

// Enhanced wrapper component for visual enhancements
const withEnhancedDisplay = (Component, displayName) => {
  const EnhancedComponent = (props) => {
    // Get enhancement context from props or global state
    const enhancementMode = props.enhancementMode || null;
    const isCompact = props.isCompact || false;
    const isFocused = props.isFocused || false;
    const isDimmed = props.isDimmed || false;

    // Pass enhancement props to the component
    return (
      <Component
        {...props}
        enhancementMode={enhancementMode}
        isCompact={isCompact}
        isFocused={isFocused}
        isDimmed={isDimmed}
      />
    );
  };

  EnhancedComponent.displayName = `Enhanced${displayName}`;
  return EnhancedComponent;
};

// Wrap lazy components with Suspense and fallback
const withSuspense = (Component, name) => (props) => (
  <React.Suspense fallback={
    <div className="bg-white p-4 rounded-lg shadow-md border-2 border-gray-200 min-w-[200px]">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  }>
    <Component {...props} />
  </React.Suspense>
);

// Enhanced wrapper for lazy components
const withSuspenseAndEnhancement = (Component, name) => {
  const SuspenseComponent = withSuspense(Component, name);
  return withEnhancedDisplay(SuspenseComponent, name);
};

export const nodeTypes = {
  agent: withEnhancedDisplay(AgentCard, 'AgentCard'),
  task: withEnhancedDisplay(TaskNode, 'TaskNode'),
  tool: withSuspenseAndEnhancement(ToolNode, 'Tool'),
  chatbot: withSuspenseAndEnhancement(ChatNode, 'Chat'),
  chat: withSuspenseAndEnhancement(ChatNode, 'Chat'),
  delay: withSuspenseAndEnhancement(DelayNode, 'Delay'),
  trigger: withSuspenseAndEnhancement(TriggerNode, 'Trigger'),
  logic: withSuspenseAndEnhancement(LogicNode, 'Logic'),
  input: withEnhancedDisplay(InputNode, 'Input'),
  output: withEnhancedDisplay(OutputNode, 'Output')
}; 



