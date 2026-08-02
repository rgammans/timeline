import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { MemoryMoment } from './MemoryMoment';

describe('MemoryMoment', () => {
  describe('construction', () => {
    it('should create from a Date', () => {
      const date = new Date('2024-01-15');
      const mm = new MemoryMoment(date);
      expect(mm.toDate().getTime()).toBe(date.getTime());
    });

    it('should create from a Dayjs', () => {
     const d = dayjs('2024-01-15');
      const mm = new MemoryMoment(d);
      expect(mm.toDayjs().isSame(d, 'day')).toBe(true); 
    });

    it('should create from another MemoryMoment', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const derived = new MemoryMoment(base);
      expect(derived.toDate().getTime()).toBe(base.toDate().getTime());
    });
  });

  describe('add', () => {
    it('should add days', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const later = base.add(5, 'days');

      expect(later.toDayjs().date()).toBe(20);
      // Original should be unchanged
      expect(base.toDayjs().date()).toBe(15);
    });

    it('should add weeks', () => {
      const base = new MemoryMoment(dayjs('2024-01-15'));
      const later = base.add(2, 'weeks');

      expect(later.toDayjs().date()).toBe(29);
    });

    it('should add months', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const later = base.add(3, 'months');

      expect(later.toDayjs().month()).toBe(3); // April (0-indexed)
    });
  });

  describe('subtract', () => {
    it('should subtract days', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const earlier = base.subtract(5, 'days');

      expect(earlier.toDayjs().date()).toBe(10);
    });

    it('should subtract weeks', () => {
      const base = new MemoryMoment(dayjs('2024-01-29'));
      const earlier = base.subtract(2, 'weeks');

      expect(earlier.toDayjs().date()).toBe(15);
    });
  });

  describe('chaining', () => {
    it('should chain multiple operations', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const result = base.add(1, 'months').add(5, 'days').subtract(1, 'weeks');

      // Jan 15 + 1 month = Feb 15
      // Feb 15 + 5 days = Feb 20
      // Feb 20 - 1 week = Feb 13
      expect(result.toDayjs().month()).toBe(1); // February
      expect(result.toDayjs().date()).toBe(13);
    });

    it('should maintain relationship when base changes', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const derived = base.add(7, 'days');

      // Initially Jan 15 + 7 = Jan 22
      expect(derived.toDayjs().date()).toBe(22);

      // Move base forward 5 days
      base.moveForward(5, 'days');

      // Now should be Jan 20 + 7 = Jan 27
      expect(derived.toDayjs().date()).toBe(27);
    });
  });

  describe('moveForward/moveBack', () => {
    it('moveForward should mutate the instance', () => {
      const mm = new MemoryMoment(new Date('2024-01-15'));
      mm.moveForward(3, 'days');

      expect(mm.toDayjs().date()).toBe(18);
    });

    it('moveBack should mutate the instance', () => {
      const mm = new MemoryMoment(new Date('2024-01-15'));
      mm.moveBack(3, 'days');

      expect(mm.toDayjs().date()).toBe(12);
    });
  });

  describe('findBase', () => {
    it('should find direct base', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const derived = base.add(7, 'days');

      const result = derived.findBase([base]);

      expect(result).not.toBeNull();
      expect(result!.index).toBe(0);
      expect(result!.value).toBe(base);
      expect(result!.ops).toHaveLength(1);
      expect(result!.ops[0].op).toBe('add');
      expect(result!.ops[0].amt).toBe(7);
    });

    it('should find base through chain', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const middle = base.add(7, 'days');
      const derived = middle.add(3, 'days');

      const result = derived.findBase([base]);

      expect(result).not.toBeNull();
      expect(result!.index).toBe(0);
      expect(result!.ops).toHaveLength(2);
    });

    it('should return null if base not found', () => {
      const base = new MemoryMoment(new Date('2024-01-15'));
      const other = new MemoryMoment(new Date('2024-02-01'));
      const derived = base.add(7, 'days');

      const result = derived.findBase([other]);

      expect(result).toBeNull();
    });
  });

  describe('static properties', () => {
    it('should have ops array', () => {
      expect(MemoryMoment.ops).toEqual(['add', 'subtract']);
    });

    it('should have verbose_ops array', () => {
      expect(MemoryMoment.verbose_ops).toEqual(['after', 'before']);
    });

    it('should have units array', () => {
      expect(MemoryMoment.units).toContain('days');
      expect(MemoryMoment.units).toContain('weeks');
      expect(MemoryMoment.units).toContain('months');
      expect(MemoryMoment.units).toContain('years');
    });
  });
});
