# Timeline

A timeline visualization tool with support for relative date relationships between events.

## Version 2.0.0

Complete rewrite from the legacy jQuery/vis.js implementation. This version uses:
- Custom SVG renderer (no heavy dependencies)
- TypeScript throughout
- Modern ES modules
- Framework-agnostic design

## Packages

| Package | Description |
|---------|-------------|
| `@timeline/core` | Core data model with relative date support |
| `@timeline/renderer` | SVG-based timeline renderer |
| `@timeline/app` | Standalone timeline application |

## Features

- **Relative Dates**: Events can be defined relative to other events (e.g., "3 days after Project Start")
- **Drag & Drop**: Move events by dragging, resize by dragging edges
- **Pan & Zoom**: Scroll to zoom, drag background to pan
- **Auto-layout**: Events automatically stack in lanes to avoid overlap
- **Persistence**: Auto-save to localStorage, import/export JSON files
- **Framework Agnostic**: Core and renderer can be wrapped by React, Angular, etc.

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the app
cd packages/timeline-app
npm run dev
```

### Using the Packages

```typescript
import { TimelineData } from '@timeline/core';
import { TimelineRenderer } from '@timeline/renderer';

// Create data model
const data = new TimelineData({
  onTimelineUpdated: () => renderer.refresh()
});

// Add events
data.createEvent('Project Start', new Date('2024-01-15'));
data.createEvent('Planning Phase', new Date('2024-01-15'), new Date('2024-01-20'));

// Create relative event (3 days after Project Start)
data.createEventRelative('Kickoff Meeting', 0, 'start', [
  { op: 'add', amt: 3, units: 'days' }
]);

// Create renderer
const container = document.getElementById('timeline');
const renderer = new TimelineRenderer(container, data);

// Listen for events
renderer.on('eventSelected', (event) => {
  console.log('Selected:', event.content);
});

renderer.on('eventMoved', ({ id, newStart, newEnd }) => {
  data.updateEventDates(id, newStart, newEnd);
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application                          │
│  (Forms, toolbar, persistence, framework integration)   │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│  @timeline/renderer │       │   @timeline/core    │
│  - SVG rendering    │◀─────▶│  - Data model       │
│  - Interactions     │       │  - Date relations   │
│  - Event emitter    │       │  - Serialization    │
└─────────────────────┘       └─────────────────────┘
```

## License

GPL-3.0
