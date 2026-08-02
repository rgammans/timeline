import type { TimelineData, TimelineEvent } from '@timeline/core';
import type {
  RendererOptions,
  ResolvedOptions,
  RendererEventType,
  RendererEventListener
} from './types';
import { ViewportManager } from './ViewportManager';
import { EventRenderer } from './EventRenderer';
import { InteractionHandler } from './InteractionHandler';
import { injectStyles } from './styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_OPTIONS: ResolvedOptions = {
  height: 200,
  padding: 20,
  eventRowHeight: 40,
  eventHeight: 24,
  pointRadius: 6,
  borderRadius: 4,
  minPixelsPerDay: 20,
  colors: {
    event: '#4a90d9',
    eventNonEditable: '#94a3b8',
    eventSelected: '#2563eb',
    eventHover: '#3b82f6',
    axis: '#64748b',
    background: '#ffffff',
    text: '#1e293b'
  }
};

/**
 * Main timeline renderer class.
 * Creates an SVG-based timeline visualization from TimelineData.
 */
export class TimelineRenderer {
  private _container: HTMLElement;
  private _data: TimelineData;
  private _options: ResolvedOptions;
  private _svg: SVGSVGElement;
  private _viewportGroup: SVGGElement;
  private _axisGroup: SVGGElement;
  private _eventsGroup: SVGGElement;

  private _viewport: ViewportManager;
  private _eventRenderer: EventRenderer;
  private _interactionHandler: InteractionHandler;

  private _resizeObserver: ResizeObserver | null = null;
  private _eventRows: Map<number, number> = new Map();

  constructor(
    container: HTMLElement,
    data: TimelineData,
    options?: RendererOptions
  ) {
    this._container = container;
    this._data = data;
    this._options = this.resolveOptions(options);

    // Inject default styles
    injectStyles();

    // Create SVG structure
    this._svg = document.createElementNS(SVG_NS, 'svg');
    this._svg.classList.add('timeline-renderer');
    this._svg.style.width = '100%';
    this._svg.style.height = `${this._options.height}px`;
    this._svg.style.backgroundColor = this._options.colors.background;

    this._viewportGroup = document.createElementNS(SVG_NS, 'g');
    this._viewportGroup.classList.add('viewport');

    this._axisGroup = document.createElementNS(SVG_NS, 'g');
    this._axisGroup.classList.add('axis');

    this._eventsGroup = document.createElementNS(SVG_NS, 'g');
    this._eventsGroup.classList.add('events');

    this._viewportGroup.appendChild(this._axisGroup);
    this._viewportGroup.appendChild(this._eventsGroup);
    this._svg.appendChild(this._viewportGroup);
    this._container.appendChild(this._svg);

    // Initialize managers
    const width = this._container.clientWidth || 800;
    this._viewport = new ViewportManager(
      width - this._options.padding * 2,
      this._options.height,
      this._options.minPixelsPerDay
    );

    this._eventRenderer = new EventRenderer(
      this._eventsGroup,
      this._viewport,
      this._options
    );

    this._interactionHandler = new InteractionHandler(
      this._svg,
      this._viewport,
      this._eventRenderer,
      (id) => this._data.getEvent(id)
    );

    // Set up resize observer
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this.handleResize());
      this._resizeObserver.observe(this._container);
    }

    // Forward view change events to trigger re-render
    this._interactionHandler.on('viewChanged', () => {
      this.renderAxis();
      this.renderEvents();
    });

    // Initial render
    this.fitToData();
    this.render();
  }

  /** Resolve options with defaults */
  private resolveOptions(options?: RendererOptions): ResolvedOptions {
    return {
      height: options?.height ?? DEFAULT_OPTIONS.height,
      padding: options?.padding ?? DEFAULT_OPTIONS.padding,
      eventRowHeight: options?.eventRowHeight ?? DEFAULT_OPTIONS.eventRowHeight,
      eventHeight: options?.eventHeight ?? DEFAULT_OPTIONS.eventHeight,
      pointRadius: options?.pointRadius ?? DEFAULT_OPTIONS.pointRadius,
      borderRadius: options?.borderRadius ?? DEFAULT_OPTIONS.borderRadius,
      minPixelsPerDay: options?.minPixelsPerDay ?? DEFAULT_OPTIONS.minPixelsPerDay,
      initialRange: options?.initialRange,
      colors: {
        ...DEFAULT_OPTIONS.colors,
        ...options?.colors
      }
    };
  }

  /** Subscribe to renderer events. Returns unsubscribe function. */
  on<T extends RendererEventType>(
    event: T,
    listener: RendererEventListener<T>
  ): () => void {
    return this._interactionHandler.on(event, listener);
  }

  /** Render the timeline */
  render(): void {
    this.renderAxis();
    this.renderEvents();
  }

  /** Render the time axis */
  private renderAxis(): void {
    // Clear existing axis
    while (this._axisGroup.firstChild) {
      this._axisGroup.removeChild(this._axisGroup.firstChild);
    }

    const ticks = this._viewport.generateTicks();
    const axisY = this._options.padding + this._options.eventRowHeight - 10;

    // Draw axis line
    const axisLine = document.createElementNS(SVG_NS, 'line');
    axisLine.setAttribute('x1', '0');
    axisLine.setAttribute('y1', String(axisY));
    axisLine.setAttribute('x2', String(this._viewport.width));
    axisLine.setAttribute('y2', String(axisY));
    axisLine.setAttribute('stroke', this._options.colors.axis);
    this._axisGroup.appendChild(axisLine);

    // Draw ticks
    for (const tick of ticks) {
      const tickHeight = tick.major ? 10 : 6;

      const tickLine = document.createElementNS(SVG_NS, 'line');
      tickLine.setAttribute('x1', String(tick.x));
      tickLine.setAttribute('y1', String(axisY - tickHeight));
      tickLine.setAttribute('x2', String(tick.x));
      tickLine.setAttribute('y2', String(axisY));
      tickLine.setAttribute('stroke', this._options.colors.axis);
      this._axisGroup.appendChild(tickLine);

      // Label
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(tick.x));
      label.setAttribute('y', String(axisY - tickHeight - 4));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', this._options.colors.axis);
      label.textContent = tick.label;
      this._axisGroup.appendChild(label);
    }
  }

  /** Render all events */
  private renderEvents(): void {
    this._eventRenderer.clear();
    this._eventRows.clear();

    const events = this._data.events;
    const rowCount = this.assignRows(events);

    // Update SVG height based on number of rows
    this.updateHeight(rowCount);

    for (const event of events) {
      const row = this._eventRows.get(event.id) ?? 0;
      this._eventRenderer.renderEvent(event, row);
    }
  }

  /** Update SVG height to fit all rows */
  private updateHeight(rowCount: number): void {
    const minRows = 1;
    const rows = Math.max(minRows, rowCount);
    const rowSpacing = this._options.eventHeight + 8;
    const eventsHeight = rows * rowSpacing;
    const totalHeight = this._options.padding * 2 + this._options.eventRowHeight + eventsHeight;

    // Use max of calculated height and configured minimum
    const height = Math.max(totalHeight, this._options.height);
    this._svg.style.height = `${height}px`;
    this._viewport.setSize(this._viewport.width, height);
  }

  /** Assign events to rows to avoid visual overlap. Returns row count. */
  private assignRows(events: TimelineEvent[]): number {
    // Sort by start pixel position
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Track end pixel positions for each row (with buffer for labels)
    const rowEnds: number[] = [];
    const minLabelWidth = 80; // Minimum width for point event + label
    const eventGap = 10; // Gap between events in same row

    for (const event of sorted) {
      const startX = this._viewport.dateToX(event.start);
      let endX: number;

      if (event.end) {
        // Range event - use actual end position
        endX = this._viewport.dateToX(event.end);
      } else {
        // Point event - add space for label
        endX = startX + minLabelWidth;
      }

      // Find first row where this event fits (no visual overlap)
      let row = 0;
      while (row < rowEnds.length && rowEnds[row] + eventGap > startX) {
        row++;
      }

      this._eventRows.set(event.id, row);
      rowEnds[row] = endX;
    }

    return rowEnds.length;
  }

  /** Add a single event (called from data callback) */
  addEvent(event: TimelineEvent): void {
    this.renderEvents(); // Re-layout all events for proper row assignment
  }

  /** Update a single event (called from data callback) */
  updateEvent(event: TimelineEvent): void {
    const row = this._eventRows.get(event.id) ?? 0;
    this._eventRenderer.renderEvent(event, row);
  }

  /** Remove a single event (called from data callback) */
  removeEvent(id: number): void {
    this._eventRenderer.removeEvent(id);
    this._eventRows.delete(id);
  }

  /** Refresh all events (called from data callback) */
  refresh(): void {
    this.renderEvents();
  }

  /** Set the visible date range */
  setViewRange(start: Date, end: Date): void {
    this._viewport.setRange(start, end);
    this.render();
  }

  /** Zoom to a specific center and scale */
  zoomTo(center: Date, pixelsPerDay: number): void {
    this._viewport.zoomTo(center, pixelsPerDay);
    this.render();
  }

  /** Fit viewport to show all data */
  fitToData(): void {
    const events = this._data.events;
    if (events.length === 0) {
      if (this._options.initialRange) {
        this._viewport.setRange(
          this._options.initialRange.start,
          this._options.initialRange.end
        );
      }
      return;
    }

    const dates: Date[] = [];
    for (const event of events) {
      dates.push(event.start);
      if (event.end) {
        dates.push(event.end);
      }
    }

    this._viewport.fitToRange(dates, 0.1);
  }

  /** Get the currently selected event ID */
  getSelectedEventId(): number | null {
    return this._eventRenderer.selectedId;
  }

  /** Select an event programmatically */
  selectEvent(id: number | null): void {
    this._eventRenderer.selectedId = id;
  }

  /** Handle container resize */
  private handleResize(): void {
    const width = this._container.clientWidth;
    if (width > 0) {
      this._viewport.setSize(
        width - this._options.padding * 2,
        this._options.height
      );
      this._svg.style.width = '100%';
      this.render();
    }
  }

  /** Clean up and remove the renderer */
  destroy(): void {
    this._interactionHandler.detach();
    this._resizeObserver?.disconnect();
    this._svg.remove();
  }
}
