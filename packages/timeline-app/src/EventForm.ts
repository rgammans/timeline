import dayjs from 'dayjs';
import type { TimelineData, TimelineEvent, DateEdge, TimeUnit, OpType } from '@timeline/core';

export type FormMode = 'create' | 'edit';

export interface EventFormOptions {
  data: TimelineData;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
}

/**
 * Manages the event create/edit form
 */
export class EventForm {
  private _data: TimelineData;
  private _onSave: () => void;
  private _onCancel: () => void;
  private _onDelete: (id: number) => void;

  private _mode: FormMode = 'create';
  private _editingId: number | null = null;
  private _initialDate: Date | null = null;

  // DOM elements
  private _form: HTMLFormElement;
  private _placeholder: HTMLElement;
  private _title: HTMLElement;
  private _nameInput: HTMLInputElement;
  private _dateTypeRadios: NodeListOf<HTMLInputElement>;
  private _absoluteFields: HTMLElement;
  private _relativeFields: HTMLElement;
  private _startInput: HTMLInputElement;
  private _hasEndCheckbox: HTMLInputElement;
  private _endGroup: HTMLElement;
  private _endInput: HTMLInputElement;
  private _refEventSelect: HTMLSelectElement;
  private _refEdgeSelect: HTMLSelectElement;
  private _offsetAmount: HTMLInputElement;
  private _offsetUnits: HTMLSelectElement;
  private _offsetDirection: HTMLSelectElement;
  private _deleteBtn: HTMLButtonElement;

  constructor(options: EventFormOptions) {
    this._data = options.data;
    this._onSave = options.onSave;
    this._onCancel = options.onCancel;
    this._onDelete = options.onDelete;

    // Get DOM elements
    this._form = document.getElementById('event-form') as HTMLFormElement;
    this._placeholder = document.getElementById('form-placeholder') as HTMLElement;
    this._title = document.getElementById('form-title') as HTMLElement;
    this._nameInput = document.getElementById('event-name') as HTMLInputElement;
    this._dateTypeRadios = document.querySelectorAll('input[name="date-type"]') as NodeListOf<HTMLInputElement>;
    this._absoluteFields = document.getElementById('absolute-fields') as HTMLElement;
    this._relativeFields = document.getElementById('relative-fields') as HTMLElement;
    this._startInput = document.getElementById('event-start') as HTMLInputElement;
    this._hasEndCheckbox = document.getElementById('event-has-end') as HTMLInputElement;
    this._endGroup = document.getElementById('end-date-group') as HTMLElement;
    this._endInput = document.getElementById('event-end') as HTMLInputElement;
    this._refEventSelect = document.getElementById('ref-event') as HTMLSelectElement;
    this._refEdgeSelect = document.getElementById('ref-edge') as HTMLSelectElement;
    this._offsetAmount = document.getElementById('offset-amount') as HTMLInputElement;
    this._offsetUnits = document.getElementById('offset-units') as HTMLSelectElement;
    this._offsetDirection = document.getElementById('offset-direction') as HTMLSelectElement;
    this._deleteBtn = document.getElementById('btn-delete') as HTMLButtonElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Form submission
    this._form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Cancel button
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      this.hide();
      this._onCancel();
    });

    // Close button
    document.getElementById('btn-close-form')?.addEventListener('click', () => {
      this.hide();
      this._onCancel();
    });

    // Delete button
    this._deleteBtn.addEventListener('click', () => {
      if (this._editingId !== null && confirm('Delete this event?')) {
        this._onDelete(this._editingId);
        this.hide();
      }
    });

    // Date type toggle
    this._dateTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.updateDateTypeFields());
    });

    // Has end checkbox
    this._hasEndCheckbox.addEventListener('change', () => {
      this._endGroup.hidden = !this._hasEndCheckbox.checked;
      if (this._hasEndCheckbox.checked && !this._endInput.value) {
        // Default end to start + 1 hour
        const start = new Date(this._startInput.value);
        if (!isNaN(start.getTime())) {
          const end = new Date(start.getTime() + 3600000);
          this._endInput.value = this.formatDatetimeLocal(end);
        }
      }
    });
  }

  private updateDateTypeFields(): void {
    const isRelative = this.getSelectedDateType() === 'relative';
    this._absoluteFields.hidden = isRelative;
    this._relativeFields.hidden = !isRelative;

    if (isRelative) {
      this.populateRefEventSelect();
    }
  }

  private getSelectedDateType(): 'absolute' | 'relative' {
    for (const radio of this._dateTypeRadios) {
      if (radio.checked) {
        return radio.value as 'absolute' | 'relative';
      }
    }
    return 'absolute';
  }

  private populateRefEventSelect(): void {
    const events = this._data.events;
    this._refEventSelect.innerHTML = '<option value="">Select an event...</option>';

    for (const event of events) {
      // Don't allow referencing self
      if (event.id === this._editingId) continue;

      const option = document.createElement('option');
      option.value = String(event.id);
      option.textContent = event.content;
      this._refEventSelect.appendChild(option);
    }
  }

  private formatDatetimeLocal(date: Date): string {
    return dayjs(date).format('YYYY-MM-DDTHH:mm');
  }

  /**
   * Show form in create mode
   */
  showCreate(initialDate?: Date): void {
    this._mode = 'create';
    this._editingId = null;
    this._initialDate = initialDate || new Date();

    this._title.textContent = 'New Event';
    this._deleteBtn.hidden = true;

    // Reset form
    this._form.reset();
    this._nameInput.value = '';
    this._startInput.value = this.formatDatetimeLocal(this._initialDate);
    this._hasEndCheckbox.checked = false;
    this._endGroup.hidden = true;
    this._endInput.value = '';

    // Default to absolute
    this._dateTypeRadios[0].checked = true;
    this.updateDateTypeFields();

    this.show();
    this._nameInput.focus();
  }

  /**
   * Show form in edit mode
   */
  showEdit(event: TimelineEvent): void {
    this._mode = 'edit';
    this._editingId = event.id;

    this._title.textContent = 'Edit Event';
    this._deleteBtn.hidden = false;

    // Populate form
    this._nameInput.value = event.content;
    this._startInput.value = this.formatDatetimeLocal(event.start);

    if (event.end) {
      this._hasEndCheckbox.checked = true;
      this._endGroup.hidden = false;
      this._endInput.value = this.formatDatetimeLocal(event.end);
    } else {
      this._hasEndCheckbox.checked = false;
      this._endGroup.hidden = true;
      this._endInput.value = '';
    }

    // Check if event is editable (absolute) or not (relative)
    if (event.editable) {
      this._dateTypeRadios[0].checked = true; // absolute
    } else {
      this._dateTypeRadios[1].checked = true; // relative
      // Note: We can't reconstruct the original relative reference from the event
      // In a full implementation, we'd store this metadata
    }
    this.updateDateTypeFields();

    // Disable date type change for existing events (would require recreating)
    this._dateTypeRadios.forEach(radio => {
      radio.disabled = true;
    });

    this.show();
    this._nameInput.focus();
  }

  private show(): void {
    this._placeholder.hidden = true;
    this._form.hidden = false;
  }

  hide(): void {
    this._form.hidden = true;
    this._placeholder.hidden = false;
    this._editingId = null;

    // Re-enable date type radios
    this._dateTypeRadios.forEach(radio => {
      radio.disabled = false;
    });
  }

  private handleSubmit(): void {
    const name = this._nameInput.value.trim();
    if (!name) return;

    const dateType = this.getSelectedDateType();

    if (this._mode === 'create') {
      this.createEvent(name, dateType);
    } else {
      this.updateEvent(name);
    }

    this.hide();
    this._onSave();
  }

  private createEvent(name: string, dateType: 'absolute' | 'relative'): void {
    if (dateType === 'absolute') {
      const start = new Date(this._startInput.value);
      const end = this._hasEndCheckbox.checked ? new Date(this._endInput.value) : undefined;
      this._data.createEvent(name, start, end);
    } else {
      const refId = parseInt(this._refEventSelect.value, 10);
      if (isNaN(refId)) {
        alert('Please select a reference event');
        return;
      }

      const refEdge = this._refEdgeSelect.value as DateEdge;
      const amount = parseInt(this._offsetAmount.value, 10) || 0;
      const units = this._offsetUnits.value as TimeUnit;
      const direction = this._offsetDirection.value as OpType;

      const ops = amount > 0 ? [{ op: direction, amt: amount, units }] : [];
      this._data.createEventRelative(name, refId, refEdge, ops);
    }
  }

  private updateEvent(name: string): void {
    if (this._editingId === null) return;

    const event = this._data.getEvent(this._editingId);
    if (!event) return;

    // Update name
    if (name !== event.content) {
      this._data.updateEventContent(this._editingId, name);
    }

    // Update dates (only for editable/absolute events)
    if (event.editable) {
      const newStart = new Date(this._startInput.value);
      const newEnd = this._hasEndCheckbox.checked ? new Date(this._endInput.value) : undefined;

      // Update start
      if (newStart.getTime() !== event.start.getTime()) {
        this._data.updateEventStart(this._editingId, newStart);
      }

      // Update end
      if (event.end && newEnd) {
        if (newEnd.getTime() !== event.end.getTime()) {
          this._data.updateEventEnd(this._editingId, newEnd);
        }
      } else if (!event.end && newEnd) {
        // Adding an end date requires recreating the event
        // For now, we don't support this - would need core changes
      } else if (event.end && !newEnd) {
        // Removing end date requires recreating the event
        // For now, we don't support this - would need core changes
      }
    }
  }

  get isVisible(): boolean {
    return !this._form.hidden;
  }

  get editingId(): number | null {
    return this._editingId;
  }
}
