import { EventEmitter } from 'events';
import {
  waitFor,
  waitForCondition,
  waitForEvent,
  expectThrowsAsync,
  measureExecutionTime,
} from '../utils/test-helpers';

describe('Test Helpers', () => {
  describe('waitFor', () => {
    it('should wait for specified duration', async () => {
      const startTime = Date.now();
      await waitFor(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some margin
      expect(endTime - startTime).toBeLessThan(150);
    });

    it('should handle zero wait time', async () => {
      const startTime = Date.now();
      await waitFor(0);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('waitForCondition', () => {
    it('should resolve when condition becomes true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      const startTime = Date.now();
      await waitForCondition(condition, 1000, 50);
      const endTime = Date.now();

      expect(counter).toBeGreaterThanOrEqual(3);
      expect(endTime - startTime).toBeLessThan(200); // Should complete quickly
    });

    it('should timeout if condition never becomes true', async () => {
      const condition = () => false;

      await expect(waitForCondition(condition, 100, 20))
        .rejects
        .toThrow('Condition not met within 100ms');
    });

    it('should handle async conditions', async () => {
      let counter = 0;
      const asyncCondition = async () => {
        counter++;
        await waitFor(10);
        return counter >= 2;
      };

      await waitForCondition(asyncCondition, 1000, 50);
      expect(counter).toBeGreaterThanOrEqual(2);
    });
  });

  describe('waitForEvent', () => {
    it('should resolve when event is emitted', async () => {
      const emitter = new EventEmitter();
      
      // Emit event after short delay
      setTimeout(() => {
        emitter.emit('test', 'arg1', 'arg2');
      }, 50);

      const args = await waitForEvent(emitter, 'test', 1000);
      
      expect(args).toEqual(['arg1', 'arg2']);
    });

    it('should timeout if event is not emitted', async () => {
      const emitter = new EventEmitter();

      await expect(waitForEvent(emitter, 'test', 100))
        .rejects
        .toThrow('Event "test" not emitted within 100ms');
    });

    it('should handle multiple event arguments', async () => {
      const emitter = new EventEmitter();
      
      setTimeout(() => {
        emitter.emit('data', { id: 1 }, 'success', 42);
      }, 10);

      const args = await waitForEvent(emitter, 'data');
      
      expect(args).toHaveLength(3);
      expect(args[0]).toEqual({ id: 1 });
      expect(args[1]).toBe('success');
      expect(args[2]).toBe(42);
    });

    it('should clean up event listeners on timeout', async () => {
      const emitter = new EventEmitter();
      const initialListenerCount = emitter.listenerCount('test');

      try {
        await waitForEvent(emitter, 'test', 50);
      } catch (error) {
        // Expected timeout
      }

      expect(emitter.listenerCount('test')).toBe(initialListenerCount);
    });
  });

  describe('expectThrowsAsync', () => {
    it('should pass when async function throws', async () => {
      const throwingFunction = async () => {
        throw new Error('Test error');
      };

      await expectThrowsAsync(throwingFunction, 'Test error');
      // If we reach here, the test passed
    });

    it('should fail when async function does not throw', async () => {
      const nonThrowingFunction = async () => {
        return 'success';
      };

      await expect(expectThrowsAsync(nonThrowingFunction))
        .rejects
        .toThrow(); // expectThrowsAsync should throw because function didn't throw
    });

    it('should validate error message with string', async () => {
      const throwingFunction = async () => {
        throw new Error('Specific error message');
      };

      await expectThrowsAsync(throwingFunction, 'Specific error');
    });

    it('should validate error message with regex', async () => {
      const throwingFunction = async () => {
        throw new Error('Error code: 404');
      };

      await expectThrowsAsync(throwingFunction, /Error code: \d+/);
    });

    it('should validate error type', async () => {
      const throwingFunction = async () => {
        throw new TypeError('Type error');
      };

      await expectThrowsAsync(throwingFunction, TypeError);
    });
  });

  describe('measureExecutionTime', () => {
    it('should measure execution time of sync function', async () => {
      const syncFunction = () => {
        // Busy wait for a short time
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait
        }
      };

      const executionTime = await measureExecutionTime(syncFunction);
      
      expect(executionTime).toBeGreaterThan(40);
      expect(executionTime).toBeLessThan(100);
    });

    it('should measure execution time of async function', async () => {
      const asyncFunction = async () => {
        await waitFor(100);
      };

      const executionTime = await measureExecutionTime(asyncFunction);
      
      expect(executionTime).toBeGreaterThan(90);
      expect(executionTime).toBeLessThan(150);
    });

    it('should handle functions that throw', async () => {
      const throwingFunction = async () => {
        await waitFor(50);
        throw new Error('Test error');
      };

      await expect(measureExecutionTime(throwingFunction))
        .rejects
        .toThrow('Test error');
    });

    it('should measure very fast functions', async () => {
      const fastFunction = () => {
        return 42;
      };

      const executionTime = await measureExecutionTime(fastFunction);
      
      expect(executionTime).toBeGreaterThanOrEqual(0);
      expect(executionTime).toBeLessThan(10);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex async workflows', async () => {
      const emitter = new EventEmitter();
      let processStarted = false;
      let processCompleted = false;

      // Simulate a complex async process
      const startProcess = async () => {
        processStarted = true;
        await waitFor(50);
        emitter.emit('progress', 'halfway');
        await waitFor(50);
        processCompleted = true;
        emitter.emit('complete', 'success');
      };

      // Start the process
      const processPromise = startProcess();

      // Wait for process to start
      await waitForCondition(() => processStarted, 1000, 10);

      // Wait for progress event
      const progressArgs = await waitForEvent(emitter, 'progress', 1000);
      expect(progressArgs[0]).toBe('halfway');

      // Wait for completion
      const completeArgs = await waitForEvent(emitter, 'complete', 1000);
      expect(completeArgs[0]).toBe('success');

      // Ensure process actually completed
      await processPromise;
      expect(processCompleted).toBe(true);
    });

    it('should handle timeout scenarios gracefully', async () => {
      const emitter = new EventEmitter();

      // This should timeout
      const timeoutPromise = waitForEvent(emitter, 'never', 100);

      await expect(timeoutPromise)
        .rejects
        .toThrow('Event "never" not emitted within 100ms');

      // Emitter should still work after timeout
      setTimeout(() => emitter.emit('later', 'data'), 10);
      
      const args = await waitForEvent(emitter, 'later', 1000);
      expect(args[0]).toBe('data');
    });
  });

  describe('performance characteristics', () => {
    it('should have consistent timing behavior', async () => {
      const timings: number[] = [];

      // Measure multiple executions
      for (let i = 0; i < 5; i++) {
        const executionTime = await measureExecutionTime(async () => {
          await waitFor(50);
        });
        timings.push(executionTime);
      }

      // All timings should be roughly similar (within 50ms of each other)
      const minTime = Math.min(...timings);
      const maxTime = Math.max(...timings);
      
      expect(maxTime - minTime).toBeLessThan(50);
      timings.forEach(time => {
        expect(time).toBeGreaterThan(40);
        expect(time).toBeLessThan(100);
      });
    });

    it('should handle high frequency events', async () => {
      const emitter = new EventEmitter();
      const events: any[] = [];

      // Listen for events
      const eventPromises = Array(10).fill(0).map((_, i) => 
        waitForEvent(emitter, `event${i}`, 1000)
      );

      // Emit events rapidly
      for (let i = 0; i < 10; i++) {
        emitter.emit(`event${i}`, `data${i}`);
      }

      const results = await Promise.all(eventPromises);
      
      expect(results).toHaveLength(10);
      results.forEach((args, i) => {
        expect(args[0]).toBe(`data${i}`);
      });
    });
  });
});