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

export const nodeTypes = {
  agent: AgentCard,
  task: TaskNode,
  tool: withSuspense(ToolNode, 'Tool'),
  chatbot: withSuspense(ChatNode, 'Chat'),
  chat: withSuspense(ChatNode, 'Chat'),
  delay: withSuspense(DelayNode, 'Delay'),
  trigger: withSuspense(TriggerNode, 'Trigger'),
  logic: withSuspense(LogicNode, 'Logic'),
  input: InputNode,
  output: OutputNode
}; 



