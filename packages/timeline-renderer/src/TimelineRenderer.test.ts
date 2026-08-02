import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimelineData } from '@timeline/core';
import { TimelineRenderer } from './TimelineRenderer';
import { ViewportManager } from './ViewportManager';

describe('TimelineRenderer', () => {
  let container: HTMLDivElement;
  let data: TimelineData;
  let renderer: TimelineRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '200px';
    document.body.appendChild(container);

    // Mock clientWidth since jsdom doesn't compute layout
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });

    data = new TimelineData();
  });

  afterEach(() => {
    renderer?.destroy();
    container.remove();
  });

  describe('constructor', () => {
    it('should create SVG element in container', () => {
      renderer = new TimelineRenderer(container, data);

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.classList.contains('timeline-renderer')).toBe(true);
    });

    it('should create viewport structure', () => {
      renderer = new TimelineRenderer(container, data);

      const viewport = container.querySelector('.viewport');
      const axis = container.querySelector('.axis');
      const events = container.querySelector('.events');

      expect(viewport).toBeTruthy();
      expect(axis).toBeTruthy();
      expect(events).toBeTruthy();
    });

    it('should apply custom height option', () => {
      renderer = new TimelineRenderer(container, data, { height: 300 });

      const svg = container.querySelector('svg');
      expect(svg?.style.height).toBe('300px');
    });

    it('should apply custom colors', () => {
      renderer = new TimelineRenderer(container, data, {
        colors: { background: '#f0f0f0' }
      });

      const svg = container.querySelector('svg');
      expect(svg?.style.backgroundColor).toBe('rgb(240, 240, 240)');
    });
  });

  describe('render', () => {
    it('should render axis ticks', () => {
      renderer = new TimelineRenderer(container, data);
      renderer.render();

      const axisLines = container.querySelectorAll('.axis line');
      expect(axisLines.length).toBeGreaterThan(0);
    });

    it('should render events', () => {
      data.createEvent('Test Event', new Date('2024-01-15'));
      renderer = new TimelineRenderer(container, data);

      const events = container.querySelectorAll('.event');
      expect(events.length).toBe(1);
    });

    it('should render point events as circles', () => {
      data.createEvent('Point Event', new Date('2024-01-15'));
      renderer = new TimelineRenderer(container, data);

      const circle = container.querySelector('.event circle');
      expect(circle).toBeTruthy();
    });

    it('should render range events as rectangles', () => {
      data.createEvent('Range Event', new Date('2024-01-15'), new Date('2024-01-20'));
      renderer = new TimelineRenderer(container, data);

      const rect = container.querySelector('.event rect');
      expect(rect).toBeTruthy();
    });

    it('should distinguish non-editable events', () => {
      // Create a relative event (non-editable)
      const base = data.createEvent('Base', new Date('2024-01-15'));
      data.createEventRelative('Relative', 0, 'start', [{ op: 'add', amt: 7, units: 'days' }]);

      renderer = new TimelineRenderer(container, data);

      const nonEditableEvent = container.querySelector('.event.non-editable');
      expect(nonEditableEvent).toBeTruthy();
    });
  });

  describe('event subscription', () => {
    it('should return unsubscribe function from on()', () => {
      renderer = new TimelineRenderer(container, data);
      const handler = vi.fn();

      const unsubscribe = renderer.on('eventSelected', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit eventSelected when clicking an event', () => {
      data.createEvent('Click Me', new Date('2024-01-15'));
      renderer = new TimelineRenderer(container, data);

      const handler = vi.fn();
      renderer.on('eventSelected', handler);

      // Simulate click
      const event = container.querySelector('.event');
      const mousedown = new MouseEvent('mousedown', { bubbles: true, button: 0 });
      const mouseup = new MouseEvent('mouseup', { bubbles: true, button: 0 });

      event?.dispatchEvent(mousedown);
      event?.dispatchEvent(mouseup);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('setViewRange', () => {
    it('should update viewport range', () => {
      renderer = new TimelineRenderer(container, data);

      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      renderer.setViewRange(start, end);

      // Re-render should use new range
      renderer.render();

      // Check that axis reflects the new range (labels should include the year)
      const labels = container.querySelectorAll('.axis text');
      const labelTexts = Array.from(labels).map(l => l.textContent);
      expect(labelTexts.some(t => t?.includes('2024') || t?.includes('Jan') || t?.includes('Feb'))).toBe(true);
    });
  });

  describe('selection', () => {
    it('should select event programmatically', () => {
      data.createEvent('Select Me', new Date('2024-01-15'));
      renderer = new TimelineRenderer(container, data);

      renderer.selectEvent(0);
      expect(renderer.getSelectedEventId()).toBe(0);
    });

    it('should deselect with null', () => {
      data.createEvent('Select Me', new Date('2024-01-15'));
      renderer = new TimelineRenderer(container, data);

      renderer.selectEvent(0);
      renderer.selectEvent(null);
      expect(renderer.getSelectedEventId()).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should remove SVG from DOM', () => {
      renderer = new TimelineRenderer(container, data);
      renderer.destroy();

      const svg = container.querySelector('svg');
      expect(svg).toBeNull();
    });
  });
});

describe('ViewportManager', () => {
  let viewport: ViewportManager;

  beforeEach(() => {
    viewport = new ViewportManager(800, 200, 20);
  });

  describe('date/pixel conversion', () => {
    it('should convert date to x position', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-11'); // 10 days
      viewport.setRange(start, end);

      // Middle should be at ~400px (half of 800)
      const middle = new Date('2024-01-06');
      const x = viewport.dateToX(middle);
      expect(x).toBeCloseTo(400, 0);
    });

    it('should convert x position to date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-11');
      viewport.setRange(start, end);

      const date = viewport.xToDate(400);
      expect(date.getDate()).toBe(6);
    });

    it('should be reversible', () => {
      viewport.setRange(new Date('2024-01-01'), new Date('2024-02-01'));

      const original = new Date('2024-01-15T12:00:00Z');
      const x = viewport.dateToX(original);
      const recovered = viewport.xToDate(x);

      expect(recovered.getTime()).toBeCloseTo(original.getTime(), -3); // Within a second
    });
  });

  describe('pan', () => {
    it('should shift the visible range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-11');
      viewport.setRange(start, end);

      const originalStart = viewport.start.getTime();
      viewport.pan(80); // Pan left by 1 day worth of pixels

      expect(viewport.start.getTime()).toBeLessThan(originalStart);
    });
  });

  describe('zoom', () => {
    it('should zoom in when factor > 1', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31'); // Wider range to allow zooming
      viewport.setRange(start, end);

      const originalDuration = end.getTime() - start.getTime();
      viewport.zoom(400, 2); // Zoom in 2x

      const newDuration = viewport.end.getTime() - viewport.start.getTime();
      expect(newDuration).toBeLessThan(originalDuration);
    });

    it('should zoom out when factor < 1', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      viewport.setRange(start, end);

      const originalDuration = end.getTime() - start.getTime();
      viewport.zoom(400, 0.5);

      const newDuration = viewport.end.getTime() - viewport.start.getTime();
      expect(newDuration).toBeGreaterThan(originalDuration);
    });
  });

  describe('fitToRange', () => {
    it('should fit viewport to given dates', () => {
      const dates = [
        new Date('2024-03-01'),
        new Date('2024-03-15'),
        new Date('2024-03-30')
      ];

      viewport.fitToRange(dates, 0.1);

      expect(viewport.start.getTime()).toBeLessThanOrEqual(dates[0].getTime());
      expect(viewport.end.getTime()).toBeGreaterThanOrEqual(dates[2].getTime());
    });

    it('should handle single date', () => {
      const dates = [new Date('2024-03-15')];

      viewport.fitToRange(dates, 0.1);

      expect(viewport.start.getTime()).toBeLessThan(dates[0].getTime());
      expect(viewport.end.getTime()).toBeGreaterThan(dates[0].getTime());
    });

    it('should handle empty array', () => {
      const originalStart = viewport.start;
      viewport.fitToRange([]);

      expect(viewport.start).toBe(originalStart);
    });
  });

  describe('generateTicks', () => {
    it('should generate tick marks', () => {
      viewport.setRange(new Date('2024-01-01'), new Date('2024-01-31'));

      const ticks = viewport.generateTicks();

      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks[0]).toHaveProperty('x');
      expect(ticks[0]).toHaveProperty('date');
      expect(ticks[0]).toHaveProperty('label');
      expect(ticks[0]).toHaveProperty('major');
    });

    it('should use appropriate interval for short range', () => {
      viewport.setRange(new Date('2024-01-01T00:00:00'), new Date('2024-01-01T12:00:00'));

      const ticks = viewport.generateTicks();

      // Should use hourly ticks
      expect(ticks.some(t => t.label.includes(':'))).toBe(true);
    });
  });
});
