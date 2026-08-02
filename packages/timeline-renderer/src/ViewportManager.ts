import dayjs from 'dayjs';
import type { ViewportState } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Manages viewport state and coordinate transformations.
 * Handles conversion between dates and pixel positions.
 */
export class ViewportManager {
  private _state: ViewportState;
  private _minPixelsPerDay: number;

  constructor(width: number, height: number, minPixelsPerDay: number = 20) {
    this._minPixelsPerDay = minPixelsPerDay;
    const now = new Date();
    const start = dayjs(now).subtract(7, 'days').toDate();
    const end = dayjs(now).add(7, 'days').toDate();
    this._state = { start, end, width, height };
  }

  get state(): ViewportState {
    return { ...this._state };
  }

  get start(): Date {
    return this._state.start;
  }

  get end(): Date {
    return this._state.end;
  }

  get width(): number {
    return this._state.width;
  }

  get height(): number {
    return this._state.height;
  }

  /** Get the current scale in pixels per millisecond */
  get scale(): number {
    const duration = this._state.end.getTime() - this._state.start.getTime();
    return this._state.width / duration;
  }

  /** Get the current scale in pixels per day */
  get pixelsPerDay(): number {
    return this.scale * MS_PER_DAY;
  }

  /** Update dimensions */
  setSize(width: number, height: number): void {
    this._state.width = width;
    this._state.height = height;
  }

  /** Set the visible date range */
  setRange(start: Date, end: Date): void {
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }
    this._state.start = start;
    this._state.end = end;
  }

  /** Convert a date to an x pixel position */
  dateToX(date: Date): number {
    const ms = date.getTime() - this._state.start.getTime();
    return ms * this.scale;
  }

  /** Convert an x pixel position to a date */
  xToDate(x: number): Date {
    const ms = x / this.scale;
    return new Date(this._state.start.getTime() + ms);
  }

  /** Convert a duration in milliseconds to pixels */
  durationToPixels(ms: number): number {
    return ms * this.scale;
  }

  /** Convert pixels to duration in milliseconds */
  pixelsToDuration(px: number): number {
    return px / this.scale;
  }

  /** Pan the viewport by a pixel offset */
  pan(deltaX: number): void {
    const deltaMs = this.pixelsToDuration(deltaX);
    this._state.start = new Date(this._state.start.getTime() - deltaMs);
    this._state.end = new Date(this._state.end.getTime() - deltaMs);
  }

  /** Zoom around a center point (in pixels) */
  zoom(centerX: number, factor: number): void {
    const centerDate = this.xToDate(centerX);
    const centerMs = centerDate.getTime();

    const currentDuration = this._state.end.getTime() - this._state.start.getTime();
    const newDuration = currentDuration / factor;

    // Prevent zooming in too far
    const minDuration = (this._state.width / this._minPixelsPerDay) * MS_PER_DAY;
    if (newDuration < minDuration && factor > 1) {
      return;
    }

    // Maintain center point position
    const leftRatio = centerX / this._state.width;
    const newStart = centerMs - newDuration * leftRatio;
    const newEnd = newStart + newDuration;

    this._state.start = new Date(newStart);
    this._state.end = new Date(newEnd);
  }

  /** Zoom to fit a specific date at center with a given scale */
  zoomTo(center: Date, pixelsPerDay: number): void {
    const centerMs = center.getTime();
    const totalDuration = (this._state.width / pixelsPerDay) * MS_PER_DAY;
    this._state.start = new Date(centerMs - totalDuration / 2);
    this._state.end = new Date(centerMs + totalDuration / 2);
  }

  /** Fit the viewport to show all given dates with padding */
  fitToRange(dates: Date[], paddingPercent: number = 0.1): void {
    if (dates.length === 0) {
      return;
    }

    const timestamps = dates.map(d => d.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    let duration = maxTime - minTime;
    if (duration === 0) {
      // Single point - show a week around it
      duration = 7 * MS_PER_DAY;
    }

    const padding = duration * paddingPercent;
    this._state.start = new Date(minTime - padding);
    this._state.end = new Date(maxTime + padding);
  }

  /** Generate tick marks for the axis */
  generateTicks(): Array<{ x: number; date: Date; label: string; major: boolean }> {
    const ticks: Array<{ x: number; date: Date; label: string; major: boolean }> = [];
    const duration = this._state.end.getTime() - this._state.start.getTime();
    const daysVisible = duration / MS_PER_DAY;

    let interval: 'hour' | 'day' | 'week' | 'month' | 'year';
    let format: string;

    if (daysVisible <= 2) {
      interval = 'hour';
      format = 'HH:mm';
    } else if (daysVisible <= 14) {
      interval = 'day';
      format = 'D MMM';
    } else if (daysVisible <= 60) {
      interval = 'week';
      format = 'D MMM';
    } else if (daysVisible <= 365) {
      interval = 'month';
      format = 'MMM YYYY';
    } else {
      interval = 'year';
      format = 'YYYY';
    }

    let current = dayjs(this._state.start);
    const end = dayjs(this._state.end);

    // Align to interval boundary
    switch (interval) {
      case 'hour':
        current = current.startOf('hour');
        break;
      case 'day':
        current = current.startOf('day');
        break;
      case 'week':
        current = current.startOf('week');
        break;
      case 'month':
        current = current.startOf('month');
        break;
      case 'year':
        current = current.startOf('year');
        break;
    }

    while (current.isBefore(end) || current.isSame(end)) {
      const date = current.toDate();
      const x = this.dateToX(date);

      if (x >= 0 && x <= this._state.width) {
        let major = false;
        switch (interval) {
          case 'hour':
            major = current.hour() === 0;
            break;
          case 'day':
            major = current.date() === 1;
            break;
          case 'week':
            major = current.date() <= 7;
            break;
          case 'month':
            major = current.month() === 0;
            break;
          case 'year':
            major = true;
            break;
        }

        ticks.push({
          x,
          date,
          label: current.format(format),
          major
        });
      }

      current = current.add(1, interval);
    }

    return ticks;
  }
}
