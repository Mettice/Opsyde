// components/rich-content/renderers/index.js

// Import lightweight renderers directly
import TextRenderer from './TextRenderer';
import MarkdownRenderer from './MarkdownRenderer';
import JsonRenderer from './JsonRenderer';
import ErrorRenderer from './ErrorRenderer';

// Lazy load heavy components for better performance
import { lazy } from 'react';

const TableRenderer = lazy(() => import('./TableRenderer'));
const ImageRenderer = lazy(() => import('./ImageRenderer'));
const ChartRenderer = lazy(() => import('./ChartRenderer'));
const CodeRenderer = lazy(() => import('./CodeRenderer'));
const HtmlRenderer = lazy(() => import('./HtmlRenderer'));
const FileRenderer = lazy(() => import('./FileRenderer'));
const AudioRenderer = lazy(() => import('./AudioRenderer'));
const VideoRenderer = lazy(() => import('./VideoRenderer'));
const EmbedRenderer = lazy(() => import('./EmbedRenderer'));

// Export all renderers
export {
  TextRenderer,
  MarkdownRenderer,
  JsonRenderer,
  TableRenderer,
  ImageRenderer,
  ChartRenderer,
  CodeRenderer,
  HtmlRenderer,
  ErrorRenderer,
  FileRenderer,
  AudioRenderer,
  VideoRenderer,
  EmbedRenderer
};

// Renderer mapping for easy access
export const RENDERER_MAP = {
  text: TextRenderer,
  markdown: MarkdownRenderer,
  json: JsonRenderer,
  table: TableRenderer,
  image: ImageRenderer,
  chart: ChartRenderer,
  code: CodeRenderer,
  html: HtmlRenderer,
  error: ErrorRenderer,
  file: FileRenderer,
  audio: AudioRenderer,
  video: VideoRenderer,
  embed: EmbedRenderer
};

// Get renderer component by content type
export const getRenderer = (contentType) => {
  return RENDERER_MAP[contentType] || TextRenderer;
};

// Preload critical renderers (optional performance optimization)
export const preloadCriticalRenderers = () => {
  // Preload commonly used renderers
  import('./TableRenderer');
  import('./CodeRenderer');
  import('./ImageRenderer');
};

// Get renderer metadata for debugging
export const getRendererInfo = (contentType) => {
  const renderer = RENDERER_MAP[contentType];
  return {
    name: renderer?.displayName || renderer?.name || 'Unknown',
    isLazy: renderer !== TextRenderer && renderer !== MarkdownRenderer && 
            renderer !== JsonRenderer && renderer !== ErrorRenderer,
    contentType
  };
};