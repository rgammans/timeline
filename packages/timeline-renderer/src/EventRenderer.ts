import type { TimelineEvent } from '@timeline/core';
import type { ResolvedOptions } from './types';
import type { ViewportManager } from './ViewportManager';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Handles rendering of individual timeline events as SVG elements.
 */
export class EventRenderer {
  private _options: ResolvedOptions;
  private _viewport: ViewportManager;
  private _container: SVGGElement;
  private _elements: Map<number, SVGGElement> = new Map();
  private _selectedId: number | null = null;

  constructor(
    container: SVGGElement,
    viewport: ViewportManager,
    options: ResolvedOptions
  ) {
    this._container = container;
    this._viewport = viewport;
    this._options = options;
  }

  get selectedId(): number | null {
    return this._selectedId;
  }

  set selectedId(id: number | null) {
    // Remove selection from previous
    if (this._selectedId !== null) {
      const prevEl = this._elements.get(this._selectedId);
      if (prevEl) {
        this.updateElementStyle(prevEl, false, this.getEventById(this._selectedId)?.editable ?? true);
      }
    }

    this._selectedId = id;

    // Add selection to new
    if (id !== null) {
      const el = this._elements.get(id);
      if (el) {
        this.updateElementStyle(el, true, this.getEventById(id)?.editable ?? true);
      }
    }
  }

  private getEventById(id: number): TimelineEvent | undefined {
    // This is a limitation - we don't store events. Called only for style updates.
    // The element itself stores the editable state.
    return undefined;
  }

  /** Create or update an event element */
  renderEvent(event: TimelineEvent, row: number): SVGGElement {
    let group = this._elements.get(event.id);

    if (!group) {
      group = document.createElementNS(SVG_NS, 'g');
      group.classList.add('event');
      group.dataset.eventId = String(event.id);
      this._container.appendChild(group);
      this._elements.set(event.id, group);
    }

    // Clear existing content
    while (group.firstChild) {
      group.removeChild(group.firstChild);
    }

    const rowSpacing = this._options.eventHeight + 8;
    const y = this._options.padding + this._options.eventRowHeight + row * rowSpacing;
    const x = this._viewport.dateToX(event.start);

    if (!event.editable) {
      group.classList.add('non-editable');
    } else {
      group.classList.remove('non-editable');
    }

    if (event.end) {
      // Range event - draw rounded rectangle
      const endX = this._viewport.dateToX(event.end);
      const width = Math.max(endX - x, 10);

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(this._options.eventHeight));
      rect.setAttribute('rx', String(this._options.borderRadius));
      rect.setAttribute('ry', String(this._options.borderRadius));
      group.appendChild(rect);

      // Label
      const label = document.createElementNS(SVG_NS, 'text');
      label.classList.add('event-label');
      label.setAttribute('x', String(x + 6));
      label.setAttribute('y', String(y + this._options.eventHeight / 2 + 4));
      label.textContent = this.truncateLabel(event.content, width - 12);
      group.appendChild(label);
    } else {
      // Point event - draw circle
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', String(x));
      circle.setAttribute('cy', String(y + this._options.eventHeight / 2));
      circle.setAttribute('r', String(this._options.pointRadius));
      group.appendChild(circle);

      // Label to the right
      const label = document.createElementNS(SVG_NS, 'text');
      label.classList.add('event-label');
      label.setAttribute('x', String(x + this._options.pointRadius + 4));
      label.setAttribute('y', String(y + this._options.eventHeight / 2 + 4));
      label.textContent = event.content;
      group.appendChild(label);
    }

    const isSelected = this._selectedId === event.id;
    this.updateElementStyle(group, isSelected, event.editable);

    return group;
  }

  /** Update element fill/stroke based on state */
  private updateElementStyle(group: SVGGElement, selected: boolean, editable: boolean): void {
    const shape = group.querySelector('rect, circle');
    const label = group.querySelector('text');

    if (shape) {
      let fill: string;
      if (selected) {
        fill = this._options.colors.eventSelected;
      } else if (!editable) {
        fill = this._options.colors.eventNonEditable;
      } else {
        fill = this._options.colors.event;
      }
      shape.setAttribute('fill', fill);

      if (!editable) {
        shape.setAttribute('stroke', this._options.colors.eventNonEditable);
        shape.setAttribute('stroke-dasharray', '4,2');
        shape.setAttribute('stroke-width', '1');
      } else if (selected) {
        shape.setAttribute('stroke', this._options.colors.eventSelected);
        shape.removeAttribute('stroke-dasharray');
        shape.setAttribute('stroke-width', '2');
      } else {
        shape.removeAttribute('stroke');
        shape.removeAttribute('stroke-dasharray');
        shape.removeAttribute('stroke-width');
      }
    }

    if (label) {
      label.setAttribute('fill', this._options.colors.text);
    }
  }

  /** Remove an event element */
  removeEvent(id: number): void {
    const el = this._elements.get(id);
    if (el) {
      el.remove();
      this._elements.delete(id);
      if (this._selectedId === id) {
        this._selectedId = null;
      }
    }
  }

  /** Get the element for an event */
  getElement(id: number): SVGGElement | undefined {
    return this._elements.get(id);
  }

  /** Get event ID from an element */
  getEventIdFromElement(element: Element): number | null {
    const group = element.closest('.event') as SVGGElement | null;
    if (group?.dataset.eventId) {
      return parseInt(group.dataset.eventId, 10);
    }
    return null;
  }

  /** Clear all events */
  clear(): void {
    for (const el of this._elements.values()) {
      el.remove();
    }
    this._elements.clear();
    this._selectedId = null;
  }

  /** Update viewport reference (after zoom/pan) */
  setViewport(viewport: ViewportManager): void {
    this._viewport = viewport;
  }

  /** Truncate label to fit within width */
  private truncateLabel(text: string, maxWidth: number): string {
    // Rough estimate: ~7px per character at 11px font
    const charsPerPx = 7;
    const maxChars = Math.floor(maxWidth / charsPerPx);

    if (text.length <= maxChars) {
      return text;
    }
    if (maxChars <= 3) {
      return '';
    }
    return text.slice(0, maxChars - 1) + '\u2026';
  }
}
