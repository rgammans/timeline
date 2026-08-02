import dayjs, { Dayjs, ManipulateType } from 'dayjs';
import type {
  DateOperation,
  OpType,
  VerboseOpType,
  TimeUnit,
  BaseReference,
  DateValue
} from './types';

/**
 * MemoryMoment represents a date that can be defined relative to another date.
 * It maintains a base date and a chain of operations (add/subtract time units).
 * When resolved via toDate(), it applies all operations to produce the final date.
 *
 * This allows events to maintain relationships - if event B is "2 weeks after event A",
 * moving event A will automatically update event B.
 */
export class MemoryMoment {
  /** The base date - can be a Date, Dayjs, or another MemoryMoment */
  base: DateValue;

  /** Chain of operations to apply to the base */
  private _ops: DateOperation[] = [];

  /** Available operation types */
  static readonly ops: OpType[] = ['add', 'subtract'];

  /** Human-readable operation names */
  static readonly verbose_ops: VerboseOpType[] = ['after', 'before'];

  /** Supported time units */
  static readonly units: TimeUnit[] = [
    'years',
    'quarters',
    'months',
    'weeks',
    'days',
    'hours',
    'minutes',
    'seconds',
    'milliseconds'
  ];

  constructor(initVal: DateValue) {
    this.base = initVal;
  }

  /** Get the operations chain (read-only copy) */
  get ops(): DateOperation[] {
    return [...this._ops];
  }

  /** Validate an operation object */
  private static validateOp(op: DateOperation): void {
    if (!op || typeof op !== 'object') {
      throw new Error('Invalid operation: must be an object');
    }
    if (!MemoryMoment.ops.includes(op.op)) {
      throw new Error(`Invalid operation type: ${op.op}`);
    }
    if (typeof op.amt !== 'number' || !Number.isFinite(op.amt)) {
      throw new Error(`Invalid amount: ${op.amt}`);
    }
    if (!MemoryMoment.units.includes(op.units)) {
      throw new Error(`Invalid time unit: ${op.units}`);
    }
  }

  /** Append an operation to the chain */
  appendOp(op: DateOperation): void {
    MemoryMoment.validateOp(op);
    this._ops.push(op);
  }

  /** Legacy method name for compatibility */
  append_op(op: DateOperation): void {
    this.appendOp(op);
  }

  /** Set to an absolute date, clearing all operations */
  set(value: Date | Dayjs | string): void {
    this._ops = [];
    this.base = dayjs(value).toDate();
  }

  /**
   * Move this instance backward in time by the specified amount.
   * Mutates this instance.
   */
  moveBack(amt: number, units: TimeUnit): void {
    this.appendOp({ op: 'subtract', amt, units });
  }

  /** Legacy method name */
  move_back(amt: number, units: TimeUnit): void {
    this.moveBack(amt, units);
  }

  /**
   * Move this instance forward in time by the specified amount.
   * Mutates this instance.
   */
  moveForward(amt: number, units: TimeUnit): void {
    this.appendOp({ op: 'add', amt, units });
  }

  /** Legacy method name */
  move_forward(amt: number, units: TimeUnit): void {
    this.moveForward(amt, units);
  }

  /**
   * Create a new MemoryMoment based on this one, with a value
   * the specified amount before this instance's value.
   * Does not mutate this instance.
   */
  subtract(amt: number, units: TimeUnit): MemoryMoment {
    const rv = new MemoryMoment(this);
    rv.appendOp({ op: 'subtract', amt, units });
    return rv;
  }

  /**
   * Create a new MemoryMoment based on this one, with a value
   * the specified amount after this instance's value.
   * Does not mutate this instance.
   */
  add(amt: number, units: TimeUnit): MemoryMoment {
    const rv = new MemoryMoment(this);
    rv.appendOp({ op: 'add', amt, units });
    return rv;
  }

  /**
   * Resolve to a Dayjs instance by applying all operations to the base.
   * @param visited - Set of already visited MemoryMoments for cycle detection (internal use)
   */
  toDayjs(visited: Set<MemoryMoment> = new Set()): Dayjs {
    if (visited.has(this)) {
      throw new Error('Circular reference detected in MemoryMoment chain');
    }
    visited.add(this);

    let rv: Dayjs;

    if (this.base instanceof MemoryMoment) {
      rv = this.base.toDayjs(visited);
    } else {
      rv = dayjs(this.base);
    }

    for (const op of this._ops) {
      // Cast to ManipulateType - 'quarters' requires dayjs quarterOfYear plugin
      const unit = op.units as ManipulateType;
      if (op.op === 'add') {
        rv = rv.add(op.amt, unit);
      } else if (op.op === 'subtract') {
        rv = rv.subtract(op.amt, unit);
      }
    }

    return rv;
  }

  /** Legacy method - returns Dayjs (was moment) */
  toMoment(): Dayjs {
    return this.toDayjs();
  }

  /** Resolve to a JavaScript Date */
  toDate(): Date {
    return this.toDayjs().toDate();
  }

  /**
   * Check if a value exists in the options array.
   * Helper for findBase.
   */
  private _checkBase(
    val: DateValue,
    opts: DateValue[]
  ): { value: DateValue; index: number } | null {
    for (let i = 0; i < opts.length; i++) {
      if (opts[i] === val) {
        return { value: opts[i], index: i };
      }
    }
    return null;
  }

  /**
   * Find the closest base object from the provided list that this
   * MemoryMoment is bound to.
   *
   * @param opts - Array of potential base values to search for
   * @returns Object with ops chain, index, and value; or null if not found
   */
  findBase(opts: DateValue[]): BaseReference | null {
    let ops: DateOperation[] = [...this._ops];
    let cur: DateValue | undefined = this.base;
    const visited = new Set<MemoryMoment>();

    while (cur) {
      const match = this._checkBase(cur, opts);
      if (match) {
        return { ops, index: match.index, value: match.value };
      }

      if (cur instanceof MemoryMoment) {
        if (visited.has(cur)) {
          throw new Error('Circular reference detected in MemoryMoment chain');
        }
        visited.add(cur);
        ops = ops.concat(cur._ops);
        cur = cur.base;
      } else {
        break;
      }
    }

    return null;
  }
}
