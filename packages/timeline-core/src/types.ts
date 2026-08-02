import type { Dayjs } from 'dayjs';
import type { MemoryMoment } from './MemoryMoment';

/** Supported time units for date operations */
export type TimeUnit =
  | 'years'
  | 'quarters'
  | 'months'
  | 'weeks'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds';

/** Operation types for relative dates */
export type OpType = 'add' | 'subtract';

/** Verbose operation names for display */
export type VerboseOpType = 'after' | 'before';

/** A single date operation */
export interface DateOperation {
  op: OpType;
  amt: number;
  units: TimeUnit;
}

/** A date value that can be absolute or relative */
export type DateValue = Date | Dayjs | MemoryMoment;

/** Result from findBase() - identifies the base date in a chain */
export interface BaseReference {
  ops: DateOperation[];
  index: number;
  value: DateValue;
  date_edge?: DateEdge;
}

/** Which edge of an event (start or end) */
export type DateEdge = 'start' | 'end';

/** Date relations for an event - stores original date representations */
export interface DateRelation {
  start: DateValue;
  end?: DateValue;
}

/** A timeline event */
export interface TimelineEvent {
  id: number;
  content: string;
  start: Date;
  end?: Date;
  editable: boolean;
  deleted?: boolean;
}

/** Serialized reference to another event's date */
export interface SerializedDateReference {
  ops: DateOperation[];
  index: number;
  date_edge: DateEdge;
}

/** Serialized event format */
export interface SerializedEvent {
  id?: number;
  content?: string;
  start?: string | SerializedDateReference;
  end?: string | SerializedDateReference;
  editable?: boolean;
  deleted?: boolean;
}

/** Callback interface for visualization integration */
export interface TimelineCallbacks {
  onEventAdded?: (event: TimelineEvent) => void;
  onEventUpdated?: (event: TimelineEvent) => void;
  onEventRemoved?: (eventId: number) => void;
  onTimelineUpdated?: (events: TimelineEvent[]) => void;
}
