import AgentCard from '../components/AgentCard';
import TaskNode from '../components/TaskNode';
import ToolNode from '../components/ToolNode';
import ChatNode from '../components/ChatNode';
import DelayNode from '../components/DelayNode';
import TriggerNode from '../components/TriggerNode';
import LogicNode from '../components/LogicNode';
import InputNode from '../components/InputNode';
import OutputNode from '../components/OutputNode';

export const nodeTypes = {
  agent: AgentCard,
  task: TaskNode,
  tool: ToolNode,
  chatbot: ChatNode,
  chat: ChatNode,
  delay: DelayNode,
  trigger: TriggerNode,
  logic: LogicNode,
  input: InputNode,
  output: OutputNode
}; 



