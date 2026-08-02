import type { TimelineEvent } from '@timeline/core';
import type { DragState, RendererEventType, RendererEventPayloads, RendererEventListener } from './types';
import type { ViewportManager } from './ViewportManager';
import type { EventRenderer } from './EventRenderer';

/**
 * Handles mouse/touch interactions on the timeline.
 * Emits events for selection, dragging, and creation requests.
 */
export class InteractionHandler {
  private _svg: SVGSVGElement;
  private _viewport: ViewportManager;
  private _eventRenderer: EventRenderer;
  private _getEvent: (id: number) => TimelineEvent | undefined;

  private _listeners: Map<RendererEventType, Set<RendererEventListener<RendererEventType>>> = new Map();
  private _dragState: DragState | null = null;
  private _panState: { startX: number; startY: number } | null = null;
  private _clickStartTime: number = 0;
  private _clickStartPos: { x: number; y: number } | null = null;

  private _boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
    dblclick: (e: MouseEvent) => void;
  };

  constructor(
    svg: SVGSVGElement,
    viewport: ViewportManager,
    eventRenderer: EventRenderer,
    getEvent: (id: number) => TimelineEvent | undefined
  ) {
    this._svg = svg;
    this._viewport = viewport;
    this._eventRenderer = eventRenderer;
    this._getEvent = getEvent;

    this._boundHandlers = {
      mousedown: this.onMouseDown.bind(this),
      mousemove: this.onMouseMove.bind(this),
      mouseup: this.onMouseUp.bind(this),
      wheel: this.onWheel.bind(this),
      dblclick: this.onDoubleClick.bind(this)
    };

    this.attach();
  }

  /** Attach event listeners */
  attach(): void {
    this._svg.addEventListener('mousedown', this._boundHandlers.mousedown);
    this._svg.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
    this._svg.addEventListener('dblclick', this._boundHandlers.dblclick);
    document.addEventListener('mousemove', this._boundHandlers.mousemove);
    document.addEventListener('mouseup', this._boundHandlers.mouseup);
  }

  /** Detach event listeners */
  detach(): void {
    this._svg.removeEventListener('mousedown', this._boundHandlers.mousedown);
    this._svg.removeEventListener('wheel', this._boundHandlers.wheel);
    this._svg.removeEventListener('dblclick', this._boundHandlers.dblclick);
    document.removeEventListener('mousemove', this._boundHandlers.mousemove);
    document.removeEventListener('mouseup', this._boundHandlers.mouseup);
  }

  /** Subscribe to an event. Returns unsubscribe function. */
  on<T extends RendererEventType>(
    event: T,
    listener: RendererEventListener<T>
  ): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener as RendererEventListener<RendererEventType>);

    return () => {
      this._listeners.get(event)?.delete(listener as RendererEventListener<RendererEventType>);
    };
  }

  /** Emit an event */
  private emit<T extends RendererEventType>(
    event: T,
    payload: RendererEventPayloads[T]
  ): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        (listener as RendererEventListener<T>)(payload);
      }
    }
  }

  /** Update viewport reference */
  setViewport(viewport: ViewportManager): void {
    this._viewport = viewport;
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this._svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Only left click

    const pos = this.getMousePos(e);
    this._clickStartTime = Date.now();
    this._clickStartPos = pos;

    // Check if clicking on an event
    const eventId = this._eventRenderer.getEventIdFromElement(e.target as Element);

    if (eventId !== null) {
      const event = this._getEvent(eventId);
      if (event && event.editable) {
        // Start drag
        const element = this._eventRenderer.getElement(eventId);
        if (element) {
          this._dragState = {
            eventId,
            startX: pos.x,
            originalDate: event.start,
            element
          };
          element.classList.add('dragging');
        }
      }
    } else {
      // Start pan
      this._panState = { startX: pos.x, startY: pos.y };
      const viewport = this._svg.querySelector('.viewport');
      viewport?.classList.add('dragging');
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    if (this._dragState) {
      // Dragging an event
      const deltaX = pos.x - this._dragState.startX;
      const deltaMs = this._viewport.pixelsToDuration(deltaX);
      const newStart = new Date(this._dragState.originalDate.getTime() + deltaMs);

      // Update element position visually
      this.updateDragPosition(this._dragState.element, newStart);
    } else if (this._panState) {
      // Panning viewport
      const deltaX = pos.x - this._panState.startX;
      if (Math.abs(deltaX) > 2) {
        this._viewport.pan(deltaX);
        this._panState.startX = pos.x;
        this.emit('viewChanged', {
          start: this._viewport.start,
          end: this._viewport.end
        });
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    const clickDuration = Date.now() - this._clickStartTime;
    const isClick = clickDuration < 300 &&
      this._clickStartPos &&
      Math.abs(pos.x - this._clickStartPos.x) < 5 &&
      Math.abs(pos.y - this._clickStartPos.y) < 5;

    if (this._dragState) {
      this._dragState.element.classList.remove('dragging');

      if (isClick) {
        // It was a click, not a drag - select the event
        this.selectEvent(this._dragState.eventId);
      } else {
        // It was a drag - emit move event
        const deltaX = pos.x - this._dragState.startX;
        const deltaMs = this._viewport.pixelsToDuration(deltaX);
        const newStart = new Date(this._dragState.originalDate.getTime() + deltaMs);

        this.emit('eventMoved', {
          id: this._dragState.eventId,
          newStart
        });
      }

      this._dragState = null;
    } else if (this._panState) {
      const viewport = this._svg.querySelector('.viewport');
      viewport?.classList.remove('dragging');

      if (isClick) {
        // Click on background - deselect
        if (this._eventRenderer.selectedId !== null) {
          this._eventRenderer.selectedId = null;
          this.emit('eventDeselected', undefined);
        }
      }

      this._panState = null;
    }

    this._clickStartPos = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const pos = this.getMousePos(e);
    const factor = e.deltaY < 0 ? 1.2 : 0.8;
    this._viewport.zoom(pos.x, factor);

    this.emit('viewChanged', {
      start: this._viewport.start,
      end: this._viewport.end
    });
  }

  private onDoubleClick(e: MouseEvent): void {
    const eventId = this._eventRenderer.getEventIdFromElement(e.target as Element);

    if (eventId === null) {
      // Double click on empty space - request create
      const pos = this.getMousePos(e);
      const date = this._viewport.xToDate(pos.x);
      this.emit('createRequested', date);
    }
  }

  private selectEvent(id: number): void {
    const event = this._getEvent(id);
    if (event) {
      this._eventRenderer.selectedId = id;
      this.emit('eventSelected', event);
      this.emit('eventClicked', event);
    }
  }

  private updateDragPosition(element: SVGGElement, newStart: Date): void {
    const x = this._viewport.dateToX(newStart);
    const rect = element.querySelector('rect');
    const circle = element.querySelector('circle');
    const text = element.querySelector('text');

    if (rect) {
      rect.setAttribute('x', String(x));
      if (text) {
        text.setAttribute('x', String(x + 6));
      }
    } else if (circle) {
      circle.setAttribute('cx', String(x));
      if (text) {
        const radius = parseFloat(circle.getAttribute('r') || '6');
        text.setAttribute('x', String(x + radius + 4));
      }
    }
  }
}
