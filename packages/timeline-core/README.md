# @timeline/core

Core data model for timeline visualization with relative date relationships.

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Test

```bash
npm test        # Watch mode
npm run test:run  # Single run
```

## Usage

```typescript
import { TimelineData, MemoryMoment } from '@timeline/core';

// Create a timeline with optional callbacks
const timeline = new TimelineData({
  onEventAdded: (event) => console.log('Added:', event),
  onTimelineUpdated: (events) => render(events)
});

// Create events with absolute dates
timeline.createEvent('Project Start', new Date('2024-01-15'));

// Create events relative to other events
timeline.createEventRelative('Phase 2', 0, 'start', [
  { op: 'add', amt: 2, units: 'weeks' }
]);

// Moving the base event automatically updates relative events
timeline.updateEventStart(0, new Date('2024-01-20'));
timeline.refreshEvents();

// Serialize/deserialize
const json = timeline.serialize();
timeline.unserialize(json);
```

## API

### TimelineData

Main class for managing timeline events.

- `createEvent(name, when, ended?)` - Create an event with absolute dates
- `createEventRelative(name, startIdx, startEdge, ops)` - Create relative event
- `updateEventStart(id, newStart)` - Move an editable event
- `deleteEvent(id)` - Mark event as deleted
- `refreshEvents()` - Recalculate all dates after changes
- `serialize()` / `unserialize(json)` - Save/load timeline data

### MemoryMoment

Represents a date that can be relative to another date.

- `add(amt, units)` - Create new moment offset forward (immutable)
- `subtract(amt, units)` - Create new moment offset backward (immutable)
- `moveForward(amt, units)` - Shift this moment forward (mutates)
- `moveBack(amt, units)` - Shift this moment backward (mutates)
- `toDate()` - Resolve to JavaScript Date
- `toDayjs()` - Resolve to Dayjs instance

### TimeUnit

Supported units: `years`, `quarters`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, `milliseconds`
