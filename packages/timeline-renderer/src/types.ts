import type { TimelineEvent } from '@timeline/core';

/** Configuration options for the timeline renderer */
export interface RendererOptions {
  /** Height of the timeline in pixels (default: 200) */
  height?: number;
  /** Padding around the timeline in pixels (default: 20) */
  padding?: number;
  /** Height of the event row in pixels (default: 40) */
  eventRowHeight?: number;
  /** Height of individual events in pixels (default: 24) */
  eventHeight?: number;
  /** Radius for point events (default: 6) */
  pointRadius?: number;
  /** Border radius for range events (default: 4) */
  borderRadius?: number;
  /** Minimum pixels per day for initial view (default: 20) */
  minPixelsPerDay?: number;
  /** Initial view range - if not provided, auto-fits to data */
  initialRange?: { start: Date; end: Date };
  /** Colors for events */
  colors?: {
    event?: string;
    eventNonEditable?: string;
    eventSelected?: string;
    eventHover?: string;
    axis?: string;
    background?: string;
    text?: string;
  };
}

/** Resolved options with all defaults applied */
export interface ResolvedOptions {
  height: number;
  padding: number;
  eventRowHeight: number;
  eventHeight: number;
  pointRadius: number;
  borderRadius: number;
  minPixelsPerDay: number;
  initialRange?: { start: Date; end: Date };
  colors: {
    event: string;
    eventNonEditable: string;
    eventSelected: string;
    eventHover: string;
    axis: string;
    background: string;
    text: string;
  };
}

/** Event types emitted by the renderer */
export type RendererEventType =
  | 'eventSelected'
  | 'eventDeselected'
  | 'eventMoved'
  | 'eventClicked'
  | 'createRequested'
  | 'viewChanged';

/** Event payloads for each event type */
export interface RendererEventPayloads {
  eventSelected: TimelineEvent;
  eventDeselected: void;
  eventMoved: { id: number; newStart: Date };
  eventClicked: TimelineEvent;
  createRequested: Date;
  viewChanged: { start: Date; end: Date };
}

/** Listener function type */
export type RendererEventListener<T extends RendererEventType> = (
  payload: RendererEventPayloads[T]
) => void;

/** Internal state for drag operations */
export interface DragState {
  eventId: number;
  startX: number;
  originalDate: Date;
  element: SVGGElement;
}

/** Viewport state */
export interface ViewportState {
  start: Date;
  end: Date;
  width: number;
  height: number;
}
