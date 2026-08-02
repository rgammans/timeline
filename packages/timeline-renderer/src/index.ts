// Main renderer
export { TimelineRenderer } from './TimelineRenderer';

// Supporting classes (for advanced use cases)
export { ViewportManager } from './ViewportManager';
export { EventRenderer } from './EventRenderer';
export { InteractionHandler } from './InteractionHandler';

// Types
export type {
  RendererOptions,
  ResolvedOptions,
  RendererEventType,
  RendererEventPayloads,
  RendererEventListener,
  ViewportState,
  DragState
} from './types';

// Styles
export { injectStyles, getStyles, DEFAULT_STYLES } from './styles';
