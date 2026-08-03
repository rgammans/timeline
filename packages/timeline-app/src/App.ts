import { TimelineData } from '@timeline/core';
import { TimelineRenderer } from '@timeline/renderer';
import { EventForm } from './EventForm';
import { saveToStorage, loadFromStorage, exportToFile, importFromFile } from './storage';

/**
 * Main application controller
 */
export class App {
  private _data: TimelineData;
  private _renderer: TimelineRenderer;
  private _form: EventForm;
  private _saveTimeout: number | null = null;

  constructor() {
    // Initialize data with callbacks
    this._data = new TimelineData({
      onEventAdded: () => this.onDataChanged(),
      onEventUpdated: () => this.onDataChanged(),
      onEventRemoved: () => this.onDataChanged(),
      onTimelineUpdated: () => this._renderer?.refresh()
    });

    // Try to load from localStorage
    const loaded = loadFromStorage(this._data);

    // If no saved data, create sample events
    if (!loaded) {
      this.createSampleEvents();
    }

    // Initialize renderer
    const container = document.getElementById('timeline-container')!;
    this._renderer = new TimelineRenderer(container, this._data, {
      height: 300
    });

    // Initialize form
    this._form = new EventForm({
      data: this._data,
      onSave: () => this.onFormSave(),
      onCancel: () => this.onFormCancel(),
      onDelete: (id) => this.onFormDelete(id)
    });

    // Set up renderer event handlers
    this.setupRendererEvents();

    // Set up toolbar handlers
    this.setupToolbar();
  }

  private createSampleEvents(): void {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this._data.createEvent('Project Start', lastWeek);
    this._data.createEvent('Planning Phase', yesterday, tomorrow);
    this._data.createEvent('Milestone 1', nextWeek);

    // Create a relative event
    this._data.createEventRelative('Review Meeting', 2, 'start', [
      { op: 'add', amt: 2, units: 'days' }
    ]);
  }

  private setupRendererEvents(): void {
    // Event selection
    this._renderer.on('eventSelected', (event) => {
      this._form.showEdit(event);
    });

    this._renderer.on('eventDeselected', () => {
      if (this._form.isVisible) {
        this._form.hide();
      }
    });

    // Event moved (drag)
    this._renderer.on('eventMoved', ({ id, newStart, newEnd }) => {
      if (newEnd) {
        this._data.updateEventDates(id, newStart, newEnd);
      } else {
        this._data.updateEventStart(id, newStart);
      }
    });

    // Event resized (edge drag)
    this._renderer.on('eventResized', ({ id, edge, newDate }) => {
      if (edge === 'start') {
        this._data.updateEventStart(id, newDate);
      } else {
        this._data.updateEventEnd(id, newDate);
      }
    });

    // Create request (double-click)
    this._renderer.on('createRequested', (date) => {
      this._renderer.selectEvent(null);
      this._form.showCreate(date);
    });
  }

  private setupToolbar(): void {
    // Fit to data
    document.getElementById('btn-fit')?.addEventListener('click', () => {
      this._renderer.fitToData();
      this._renderer.render();
    });

    // Go to today
    document.getElementById('btn-today')?.addEventListener('click', () => {
      this._renderer.zoomTo(new Date(), 50);
    });

    // New event
    document.getElementById('btn-new')?.addEventListener('click', () => {
      this._renderer.selectEvent(null);
      this._form.showCreate();
    });

    // Export
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const filename = `timeline-${new Date().toISOString().slice(0, 10)}.json`;
      exportToFile(this._data, filename);
    });

    // Import
    const importInput = document.getElementById('file-import') as HTMLInputElement;
    document.getElementById('btn-import')?.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (file) {
        try {
          await importFromFile(this._data, file);
          this._renderer.fitToData();
          this._renderer.render();
          this._form.hide();
        } catch (e) {
          alert('Failed to import file: ' + (e as Error).message);
        }
        importInput.value = '';
      }
    });
  }

  private onDataChanged(): void {
    // Debounce save to localStorage
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = window.setTimeout(() => {
      saveToStorage(this._data);
      this._saveTimeout = null;
    }, 500);
  }

  private onFormSave(): void {
    this._renderer.refresh();
    this._renderer.selectEvent(null);
  }

  private onFormCancel(): void {
    this._renderer.selectEvent(null);
  }

  private onFormDelete(id: number): void {
    this._data.deleteEvent(id);
    this._renderer.refresh();
    this._renderer.selectEvent(null);
  }
}
