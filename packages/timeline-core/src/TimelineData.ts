import dayjs, { Dayjs } from 'dayjs';
import { MemoryMoment } from './MemoryMoment';
import type {
  DateValue,
  DateRelation,
  TimelineEvent,
  DateOperation,
  TimelineCallbacks,
  SerializedEvent,
  SerializedDateReference,
  DateEdge
} from './types';

/**
 * Manages timeline event data and their date relationships.
 * This is the core data model, independent of any visualization library.
 */
export class TimelineData {
  /** Array of timeline events */
  private _events: TimelineEvent[] = [];

  /** Parallel array storing original date representations (including MemoryMoments) */
  private _dateRelations: DateRelation[] = [];

  /** Optional callbacks for visualization integration */
  private _callbacks: TimelineCallbacks;

  constructor(callbacks: TimelineCallbacks = {}) {
    this._callbacks = callbacks;
  }

  /** Get all non-deleted events */
  get events(): TimelineEvent[] {
    return this._events.filter(e => !e.deleted);
  }

  /** Get all events including deleted (for serialization) */
  get allEvents(): TimelineEvent[] {
    return [...this._events];
  }

  /** Get date relations (for advanced use cases) */
  get dateRelations(): DateRelation[] {
    return [...this._dateRelations];
  }

  /** Get event count (excluding deleted) */
  get length(): number {
    return this.events.length;
  }

  /**
   * Check if a MemoryMoment is a "root" (no operations, base is not a MemoryMoment).
   * Root MemoryMoments are editable; derived ones are not.
   */
  private isRootMoment(mm: MemoryMoment): boolean {
    return mm.ops.length === 0 && !(mm.base instanceof MemoryMoment);
  }

  /**
   * Process date values for output, converting MemoryMoments to Dates.
   * Also determines if the event should be editable.
   */
  private processDate(
    start: DateValue,
    end?: DateValue
  ): { start: Date; end?: Date; editable: boolean } {
    let editable = true;
    let processedStart: Date;
    let processedEnd: Date | undefined;

    // Process start date
    if (start instanceof MemoryMoment) {
      // Editable only if it's a root moment (no ops, not derived from another moment)
      editable = this.isRootMoment(start);
      processedStart = start.toDate();
    } else if (start instanceof Date) {
      processedStart = start;
    } else {
      // Dayjs
      processedStart = (start as Dayjs).toDate();
    }

    // Process end date
    if (end !== undefined) {
      if (end instanceof MemoryMoment) {
        processedEnd = end.toDate();
      } else if (end instanceof Date) {
        processedEnd = end;
      } else {
        processedEnd = (end as Dayjs).toDate();
      }
    }

    return { start: processedStart, end: processedEnd, editable };
  }

  /**
   * Wrap a date value in a MemoryMoment if it isn't already one.
   * This ensures all dates can be updated in place for relative references.
   */
  private wrapInMemoryMoment(value: DateValue): MemoryMoment {
    if (value instanceof MemoryMoment) {
      return value;
    }
    return new MemoryMoment(value);
  }

  /**
   * Create an event with absolute or relative dates.
   * @param name - Event content/label
   * @param when - Start date (Date, Dayjs, or MemoryMoment)
   * @param ended - Optional end date
   * @returns The start date value (for chaining relative dates)
   */
  createEvent(name: string, when: DateValue, ended?: DateValue): DateValue {
    console.assert(
      this._events.length === this._dateRelations.length,
      'Internal data inconsistent'
    );

    const loc = this._events.length;

    // Track if user provided MemoryMoment (non-editable) vs Date/Dayjs (editable)
    const wasMemoryMoment = when instanceof MemoryMoment;
    const endWasMemoryMoment = ended instanceof MemoryMoment;

    // Wrap dates in MemoryMoment to maintain relationships
    const startMM = this.wrapInMemoryMoment(when);
    const endMM = ended ? this.wrapInMemoryMoment(ended) : undefined;

    this._dateRelations[loc] = { start: startMM, end: endMM };

    const dates = this.processDate(startMM, endMM);

    // Event is editable only if user provided plain Date/Dayjs (not MemoryMoment)
    const editable = !wasMemoryMoment && (!ended || !endWasMemoryMoment);

    const event: TimelineEvent = {
      id: loc,
      content: name,
      start: dates.start,
      end: dates.end,
      editable
    };

    this._events[loc] = event;
    this._callbacks.onEventAdded?.(event);

    return startMM;
  }

  /**
   * Create an event relative to another event.
   * @param name - Event content/label
   * @param startIdx - Index of the reference event
   * @param startEdge - Which edge of the reference event ('start' or 'end')
   * @param startOps - Operations to apply (e.g., add 2 weeks)
   */
  createEventRelative(
    name: string,
    startIdx: number,
    startEdge: DateEdge,
    startOps: DateOperation[]
  ): DateValue {
    if (startIdx < 0 || startIdx >= this._dateRelations.length) {
      throw new Error(`Invalid event index: ${startIdx}`);
    }
    const relation = this._dateRelations[startIdx];
    if (!relation) {
      throw new Error(`Event ${startIdx} not found`);
    }
    const baseDate = relation[startEdge];
    if (!baseDate) {
      throw new Error(`Event ${startIdx} has no ${startEdge} date`);
    }

    const start = new MemoryMoment(baseDate);
    for (const op of startOps) {
      start.appendOp(op);
    }

    return this.createEvent(name, start);
  }

  /**
   * Get an event by ID.
   */
  getEvent(id: number): TimelineEvent | undefined {
    return this._events[id];
  }

  /**
   * Get the date relation for an event.
   */
  getDateRelation(id: number): DateRelation | undefined {
    return this._dateRelations[id];
  }

  /**
   * Update an event's content.
   */
  updateEventContent(id: number, content: string): void {
    if (this._events[id] && !this._events[id].deleted) {
      this._events[id].content = content;
      this._callbacks.onEventUpdated?.(this._events[id]);
    }
  }

  /**
   * Update an event's start date (only for editable events).
   */
  updateEventStart(id: number, newStart: Date | Dayjs): void {
    const event = this._events[id];
    if (!event || event.deleted || !event.editable) {
      return;
    }

    const relation = this._dateRelations[id];
    // All dates are wrapped in MemoryMoment, so we can call set()
    (relation.start as MemoryMoment).set(newStart instanceof Date ? newStart : newStart.toDate());

    this.refreshEvents();
  }

  /**
   * Mark an event as deleted.
   * We set a flag rather than removing to preserve array indices for references.
   */
  deleteEvent(id: number): void {
    if (this._events[id]) {
      this._events[id].deleted = true;
      this._callbacks.onEventRemoved?.(id);
    }
  }

  /**
   * Refresh all event dates from their relations.
   * Call this after moving an event that others depend on.
   */
  refreshEvents(): void {
    for (let i = 0; i < this._events.length; i++) {
      if (!this._events[i].deleted) {
        const dates = this.processDate(
          this._dateRelations[i].start,
          this._dateRelations[i].end
        );
        this._events[i].start = dates.start;
        this._events[i].end = dates.end;
      }
    }
    this._callbacks.onTimelineUpdated?.(this.events);
  }

  /**
   * Serialize the timeline to a JSON string.
   * Preserves date relationships for later restoration.
   */
  serialize(): string {
    const result: SerializedEvent[] = [];
    const referenceList: DateValue[] = [];
    const lookupData: { event_idx: number; date_edge: DateEdge }[] = [];

    // Build reference list of all dates
    const addDate = (date: DateValue | undefined, idx: number, edge: DateEdge) => {
      if (date) {
        referenceList.push(date);
        lookupData.push({ event_idx: idx, date_edge: edge });
      }
    };

    // Resolve a date to either an ISO string or a reference object
    const resolveDate = (
      date: DateValue
    ): string | SerializedDateReference => {
      if (date instanceof MemoryMoment) {
        const refdata = date.findBase(referenceList);
        if (refdata) {
          const resolved = lookupData[refdata.index];
          return {
            ops: refdata.ops,
            index: resolved.event_idx,
            date_edge: resolved.date_edge
          };
        } else {
          console.warn('Failed to maintain all references');
          return date.toDayjs().toISOString();
        }
      } else if (date instanceof Date) {
        return date.toISOString();
      } else {
        return (date as Dayjs).toISOString();
      }
    };

    // First pass: build reference list
    for (let i = 0; i < this._events.length; i++) {
      addDate(this._dateRelations[i].start, i, 'start');
      addDate(this._dateRelations[i].end, i, 'end');
    }

    // Second pass: build serialized events
    for (let i = 0; i < this._events.length; i++) {
      const ev = this._events[i];

      if (ev.deleted) {
        result.push({ deleted: true });
      } else if (ev.editable) {
        // Simple event with absolute dates
        result.push({
          id: ev.id,
          content: ev.content,
          start: ev.start.toISOString(),
          end: ev.end?.toISOString(),
          editable: true
        });
      } else {
        // Event with relative dates
        const serialized: SerializedEvent = {
          id: ev.id,
          content: ev.content
        };

        const startRel = this._dateRelations[i].start;
        const endRel = this._dateRelations[i].end;

        serialized.start = resolveDate(startRel);
        if (endRel) {
          serialized.end = resolveDate(endRel);
        }

        result.push(serialized);
      }
    }

    return JSON.stringify(result);
  }

  /**
   * Load timeline data from a serialized JSON string.
   */
  unserialize(data: string): void {
    let objs: SerializedEvent[];
    try {
      objs = JSON.parse(data);
    } catch {
      throw new Error('Invalid JSON data');
    }
    if (!Array.isArray(objs)) {
      throw new Error('Expected array of events');
    }
    const newEvents: Array<{
      content: string;
      editable: boolean;
      id: number;
      start: DateValue;
      end?: DateValue;
    }> = [];
    const indexMap: number[] = [];
    const fixups: Array<{
      idx: number;
      edge: DateEdge;
      references: number;
      reference_edge: DateEdge;
    }> = [];

    const loadRelDate = (
      date: string | SerializedDateReference,
      idx: number,
      edge: DateEdge
    ): DateValue => {
      if (typeof date === 'string') {
        const parsed = dayjs(date);
        if (!parsed.isValid()) {
          throw new Error(`Invalid date string: ${date}`);
        }
        return parsed;
      } else {
        // Validate serialized reference structure
        if (typeof date !== 'object' || date === null) {
          throw new Error('Invalid date reference: expected object');
        }
        if (typeof date.index !== 'number') {
          throw new Error('Invalid date reference: missing or invalid index');
        }
        if (!Array.isArray(date.ops)) {
          throw new Error('Invalid date reference: ops must be an array');
        }
        if (date.date_edge !== 'start' && date.date_edge !== 'end') {
          throw new Error(`Invalid date_edge: ${date.date_edge}`);
        }

        const referentIdx = indexMap.indexOf(date.index);
        if (referentIdx === -1) {
          // Forward reference or deleted - create placeholder
          const rv = new MemoryMoment(new Date());
          for (const op of date.ops) {
            rv.appendOp(op);
          }
          fixups.push({
            idx,
            edge,
            references: date.index,
            reference_edge: date.date_edge
          });
          return rv;
        } else {
          const baseEvent = newEvents[referentIdx];
          const baseDate = baseEvent[date.date_edge];
          if (!baseDate) {
            throw new Error(`Missing ${date.date_edge} date on event ${referentIdx}`);
          }
          const rv = new MemoryMoment(baseDate);
          for (const op of date.ops) {
            rv.appendOp(op);
          }
          return rv;
        }
      }
    };

    // First pass: load events
    for (let eventIdx = 0; eventIdx < objs.length; eventIdx++) {
      const o = objs[eventIdx];
      if (o.deleted) {
        continue;
      }

      // Validate required fields for non-deleted events
      if (typeof o.content !== 'string') {
        throw new Error(`Event ${eventIdx}: content must be a string`);
      }
      if (o.start === undefined || o.start === null) {
        throw new Error(`Event ${eventIdx}: missing start date`);
      }

      const i = newEvents.length;

      if (o.editable) {
        if (typeof o.start !== 'string') {
          throw new Error(`Event ${eventIdx}: editable event start must be a string`);
        }
        const startDate = dayjs(o.start);
        if (!startDate.isValid()) {
          throw new Error(`Event ${eventIdx}: invalid start date`);
        }
        indexMap.push(o.id ?? i);
        newEvents.push({
          content: o.content,
          editable: true,
          id: i,
          start: startDate,
          end: o.end ? dayjs(o.end as string) : undefined
        });
      } else {
        indexMap.push(o.id ?? i);
        const evt: typeof newEvents[0] = {
          content: o.content,
          editable: false,
          id: i,
          start: loadRelDate(o.start, i, 'start'),
          end: o.end ? loadRelDate(o.end, i, 'end') : undefined
        };
        newEvents.push(evt);
      }
    }

    // Second pass: fix forward references
    for (const fixup of fixups) {
      const referentIdx = indexMap.indexOf(fixup.references);
      if (referentIdx !== -1) {
        const referent = newEvents[referentIdx][fixup.reference_edge];
        const objFix = newEvents[fixup.idx];
        const target = objFix[fixup.edge];
        if (target instanceof MemoryMoment && referent) {
          target.base = referent;
        }
      }
    }

    // Clear and rebuild internal state
    this._events = [];
    this._dateRelations = [];

    for (const ev of newEvents) {
      const dates = this.processDate(ev.start, ev.end);
      this._dateRelations.push({ start: ev.start, end: ev.end });
      this._events.push({
        id: this._events.length,
        content: ev.content,
        start: dates.start,
        end: dates.end,
        editable: dates.editable
      });
    }

    this._callbacks.onTimelineUpdated?.(this.events);
  }

  /**
   * Clear all events.
   */
  clear(): void {
    this._events = [];
    this._dateRelations = [];
    this._callbacks.onTimelineUpdated?.([]);
  }
}
