/** Default CSS styles for the timeline renderer */
export const DEFAULT_STYLES = `
.timeline-renderer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  user-select: none;
}

.timeline-renderer .viewport {
  cursor: grab;
}

.timeline-renderer .viewport.dragging {
  cursor: grabbing;
}

.timeline-renderer .axis line {
  stroke: currentColor;
  stroke-width: 1;
}

.timeline-renderer .axis text {
  fill: currentColor;
  font-size: 10px;
}

.timeline-renderer .event {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.timeline-renderer .event:hover {
  opacity: 0.85;
}

.timeline-renderer .event.dragging {
  opacity: 0.7;
}

.timeline-renderer .event.drag-move {
  cursor: grabbing;
}

.timeline-renderer .event.drag-resize-start,
.timeline-renderer .event.drag-resize-end {
  cursor: ew-resize;
}

.timeline-renderer .event.non-editable {
  cursor: default;
}

.timeline-renderer .event-label {
  pointer-events: none;
  font-size: 11px;
}
`;

/** Inject styles into document if not already present */
export function injectStyles(): void {
  const styleId = 'timeline-renderer-styles';
  if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = DEFAULT_STYLES;
    document.head.appendChild(style);
  }
}

/** Get the default styles string for manual injection */
export function getStyles(): string {
  return DEFAULT_STYLES;
}
