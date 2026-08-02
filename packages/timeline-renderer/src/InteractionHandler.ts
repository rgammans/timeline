import type { TimelineEvent } from '@timeline/core';
import type { DragState, DragMode, RendererEventType, RendererEventPayloads, RendererEventListener } from './types';
import type { ViewportManager } from './ViewportManager';
import type { EventRenderer } from './EventRenderer';

const EDGE_THRESHOLD = 8; // Pixels from edge to trigger resize mode

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
        const element = this._eventRenderer.getElement(eventId);
        if (element) {
          // Determine drag mode based on click position
          const mode = this.getDragMode(element, pos.x, event);

          this._dragState = {
            eventId,
            startX: pos.x,
            originalStart: event.start,
            originalEnd: event.end,
            mode,
            element
          };
          element.classList.add('dragging');
          element.classList.add(`drag-${mode}`);
        }
      }
    } else {
      // Start pan
      this._panState = { startX: pos.x, startY: pos.y };
      const viewport = this._svg.querySelector('.viewport');
      viewport?.classList.add('dragging');
    }
  }

  /** Determine drag mode based on where the user clicked */
  private getDragMode(element: SVGGElement, clickX: number, event: TimelineEvent): DragMode {
    // Point events can only be moved
    if (!event.end) {
      return 'move';
    }

    const rect = element.querySelector('rect');
    if (!rect) {
      return 'move';
    }

    const rectX = parseFloat(rect.getAttribute('x') || '0');
    const rectWidth = parseFloat(rect.getAttribute('width') || '0');
    const leftEdge = rectX;
    const rightEdge = rectX + rectWidth;

    if (clickX <= leftEdge + EDGE_THRESHOLD) {
      return 'resize-start';
    } else if (clickX >= rightEdge - EDGE_THRESHOLD) {
      return 'resize-end';
    }
    return 'move';
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    if (this._dragState) {
      const deltaX = pos.x - this._dragState.startX;
      const deltaMs = this._viewport.pixelsToDuration(deltaX);

      switch (this._dragState.mode) {
        case 'move': {
          const newStart = new Date(this._dragState.originalStart.getTime() + deltaMs);
          const newEnd = this._dragState.originalEnd
            ? new Date(this._dragState.originalEnd.getTime() + deltaMs)
            : undefined;
          this.updateDragPosition(this._dragState.element, newStart, newEnd, 'move');
          break;
        }
        case 'resize-start': {
          const newStart = new Date(this._dragState.originalStart.getTime() + deltaMs);
          // Don't allow start to go past end
          if (this._dragState.originalEnd && newStart < this._dragState.originalEnd) {
            this.updateDragPosition(this._dragState.element, newStart, this._dragState.originalEnd, 'resize-start');
          }
          break;
        }
        case 'resize-end': {
          const newEnd = new Date(this._dragState.originalEnd!.getTime() + deltaMs);
          // Don't allow end to go before start
          if (newEnd > this._dragState.originalStart) {
            this.updateDragPosition(this._dragState.element, this._dragState.originalStart, newEnd, 'resize-end');
          }
          break;
        }
      }
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
    } else {
      // Update cursor based on hover position
      this.updateCursor(e, pos);
    }
  }

  /** Update cursor when hovering over events */
  private updateCursor(e: MouseEvent, pos: { x: number; y: number }): void {
    const eventId = this._eventRenderer.getEventIdFromElement(e.target as Element);
    if (eventId === null) {
      this._svg.style.cursor = '';
      return;
    }

    const event = this._getEvent(eventId);
    if (!event || !event.editable) {
      this._svg.style.cursor = 'default';
      return;
    }

    if (!event.end) {
      this._svg.style.cursor = 'grab';
      return;
    }

    const element = this._eventRenderer.getElement(eventId);
    if (!element) return;

    const mode = this.getDragMode(element, pos.x, event);
    switch (mode) {
      case 'resize-start':
      case 'resize-end':
        this._svg.style.cursor = 'ew-resize';
        break;
      case 'move':
        this._svg.style.cursor = 'grab';
        break;
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
      this._dragState.element.classList.remove(`drag-${this._dragState.mode}`);
      this._svg.style.cursor = '';

      if (isClick) {
        // It was a click, not a drag - select the event
        this.selectEvent(this._dragState.eventId);
      } else {
        // It was a drag - emit appropriate event
        const deltaX = pos.x - this._dragState.startX;
        const deltaMs = this._viewport.pixelsToDuration(deltaX);

        switch (this._dragState.mode) {
          case 'move': {
            const newStart = new Date(this._dragState.originalStart.getTime() + deltaMs);
            const newEnd = this._dragState.originalEnd
              ? new Date(this._dragState.originalEnd.getTime() + deltaMs)
              : undefined;
            this.emit('eventMoved', {
              id: this._dragState.eventId,
              newStart,
              newEnd
            });
            break;
          }
          case 'resize-start': {
            const newStart = new Date(this._dragState.originalStart.getTime() + deltaMs);
            if (!this._dragState.originalEnd || newStart < this._dragState.originalEnd) {
              this.emit('eventResized', {
                id: this._dragState.eventId,
                edge: 'start',
                newDate: newStart
              });
            }
            break;
          }
          case 'resize-end': {
            const newEnd = new Date(this._dragState.originalEnd!.getTime() + deltaMs);
            if (newEnd > this._dragState.originalStart) {
              this.emit('eventResized', {
                id: this._dragState.eventId,
                edge: 'end',
                newDate: newEnd
              });
            }
            break;
          }
        }
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

  private updateDragPosition(
    element: SVGGElement,
    newStart: Date,
    newEnd: Date | undefined,
    mode: DragMode
  ): void {
    const startX = this._viewport.dateToX(newStart);
    const rect = element.querySelector('rect');
    const circle = element.querySelector('circle');
    const text = element.querySelector('text');

    if (rect && newEnd) {
      const endX = this._viewport.dateToX(newEnd);
      const width = Math.max(endX - startX, 10);

      rect.setAttribute('x', String(startX));
      rect.setAttribute('width', String(width));

      if (text) {
        text.setAttribute('x', String(startX + 6));
      }
    } else if (circle) {
      circle.setAttribute('cx', String(startX));
      if (text) {
        const radius = parseFloat(circle.getAttribute('r') || '6');
        text.setAttribute('x', String(startX + radius + 4));
      }
    }
  }
}
