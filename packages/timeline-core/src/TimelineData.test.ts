import { describe, it, expect, vi } from 'vitest';
import dayjs from 'dayjs';
import { TimelineData } from './TimelineData';
import { MemoryMoment } from './MemoryMoment';

describe('TimelineData', () => {
  describe('createEvent', () => {
    it('should create an event with absolute date', () => {
      const timeline = new TimelineData();
      const date = new Date('2024-01-15');

      timeline.createEvent('Test Event', date);

      expect(timeline.length).toBe(1);
      expect(timeline.events[0].content).toBe('Test Event');
      expect(timeline.events[0].editable).toBe(true);
    });

    it('should create an event with Dayjs date', () => {
      const timeline = new TimelineData();
      const date = dayjs('2024-01-15');

      timeline.createEvent('Test Event', date);

      expect(timeline.length).toBe(1);
      expect(timeline.events[0].start.getTime()).toBe(date.toDate().getTime());
    });

    it('should create an event with MemoryMoment (non-editable)', () => {
      const timeline = new TimelineData();
      const mm = new MemoryMoment(new Date('2024-01-15'));

      timeline.createEvent('Relative Event', mm);

      expect(timeline.events[0].editable).toBe(false);
    });

    it('should create event with start and end dates', () => {
      const timeline = new TimelineData();
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      timeline.createEvent('Range Event', start, end);

      expect(timeline.events[0].start.getTime()).toBe(start.getTime());
      expect(timeline.events[0].end?.getTime()).toBe(end.getTime());
    });

    it('should call onEventAdded callback', () => {
      const callback = vi.fn();
      const timeline = new TimelineData({ onEventAdded: callback });

      timeline.createEvent('Test', new Date());

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Test' })
      );
    });
  });

  describe('createEventRelative', () => {
    it('should create event relative to another event', () => {
      const timeline = new TimelineData();
      const baseDate = new Date('2024-01-15');

      timeline.createEvent('Base Event', baseDate);
      timeline.createEventRelative('Later Event', 0, 'start', [
        { op: 'add', amt: 7, units: 'days' }
      ]);

      const laterEvent = timeline.events[1];
      expect(laterEvent.content).toBe('Later Event');
      expect(laterEvent.editable).toBe(false);
      expect(dayjs(laterEvent.start).date()).toBe(22); // 15 + 7
    });

    it('should update relative events when base moves', () => {
      const timeline = new TimelineData();

      timeline.createEvent('Base', dayjs('2024-01-15'));
      timeline.createEventRelative('Relative', 0, 'start', [
        { op: 'add', amt: 7, units: 'days' }
      ]);

      // Move the base event
      timeline.updateEventStart(0, dayjs('2024-01-20'));
      timeline.refreshEvents();

      // Relative event should follow
      expect(dayjs(timeline.events[1].start).date()).toBe(27); // 20 + 7
    });
  });

  describe('deleteEvent', () => {
    it('should mark event as deleted', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Test', new Date());

      timeline.deleteEvent(0);

      expect(timeline.length).toBe(0);
      expect(timeline.allEvents[0].deleted).toBe(true);
    });

    it('should call onEventRemoved callback', () => {
      const callback = vi.fn();
      const timeline = new TimelineData({ onEventRemoved: callback });
      timeline.createEvent('Test', new Date());

      timeline.deleteEvent(0);

      expect(callback).toHaveBeenCalledWith(0);
    });
  });

  describe('updateEventContent', () => {
    it('should update event content', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Original', new Date());

      timeline.updateEventContent(0, 'Updated');

      expect(timeline.events[0].content).toBe('Updated');
    });

    it('should not update deleted events', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Original', new Date());
      timeline.deleteEvent(0);

      timeline.updateEventContent(0, 'Updated');

      expect(timeline.allEvents[0].content).toBe('Original');
    });
  });

  describe('serialize/unserialize', () => {
    it('should round-trip simple events', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Event 1', new Date('2024-01-15'));
      timeline.createEvent('Event 2', new Date('2024-02-20'));

      const json = timeline.serialize();
      const timeline2 = new TimelineData();
      timeline2.unserialize(json);

      expect(timeline2.length).toBe(2);
      expect(timeline2.events[0].content).toBe('Event 1');
      expect(timeline2.events[1].content).toBe('Event 2');
    });

    it('should round-trip relative events', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Base', dayjs('2024-01-15'));
      timeline.createEventRelative('Relative', 0, 'start', [
        { op: 'add', amt: 7, units: 'days' }
      ]);

      const json = timeline.serialize();
      const timeline2 = new TimelineData();
      timeline2.unserialize(json);

      expect(timeline2.length).toBe(2);
      expect(timeline2.events[1].editable).toBe(false);

      // Verify relationship is maintained
      const relation = timeline2.getDateRelation(1);
      expect(relation?.start).toBeInstanceOf(MemoryMoment);
    });

    it('should handle deleted events', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Event 1', new Date('2024-01-15'));
      timeline.createEvent('Event 2', new Date('2024-02-20'));
      timeline.deleteEvent(0);

      const json = timeline.serialize();
      const timeline2 = new TimelineData();
      timeline2.unserialize(json);

      expect(timeline2.length).toBe(1);
      expect(timeline2.events[0].content).toBe('Event 2');
    });
  });

  describe('clear', () => {
    it('should remove all events', () => {
      const timeline = new TimelineData();
      timeline.createEvent('Event 1', new Date());
      timeline.createEvent('Event 2', new Date());

      timeline.clear();

      expect(timeline.length).toBe(0);
    });

    it('should call onTimelineUpdated with empty array', () => {
      const callback = vi.fn();
      const timeline = new TimelineData({ onTimelineUpdated: callback });
      timeline.createEvent('Event', new Date());

      timeline.clear();

      expect(callback).toHaveBeenLastCalledWith([]);
    });
  });
});
