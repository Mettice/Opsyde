import React from 'react';
import { FlowProvider } from '../context/FlowContext';
import FlowCanvas from './FlowCanvas';

/**
 * FlowCanvasWithProvider is a wrapper component that provides the FlowContext
 * to the FlowCanvas component. This allows the FlowCanvas component to access
 * the shared state and handlers from the context.
 */
const FlowCanvasWithProvider = (props) => {
  return (
    <FlowProvider>
      <FlowCanvas {...props} />
    </FlowProvider>
  );
};

export default FlowCanvasWithProvider;