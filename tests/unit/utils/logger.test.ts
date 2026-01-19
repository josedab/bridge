/**
 * Tests for logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, createLogger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default config', () => {
      const logger = new Logger();
      // Should use info level by default
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      logger.info('info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should accept custom log level', () => {
      const logger = new Logger({ level: 'debug' });
      logger.debug('debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should accept colors option', () => {
      const logger = new Logger({ colors: false });
      logger.info('test');
      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      // Should not contain ANSI codes
      expect(output).not.toContain('\x1b[');
    });

    it('should accept prefix option', () => {
      const logger = new Logger({ prefix: 'test-prefix' });
      logger.info('test message');
      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      expect(output).toContain('[test-prefix]');
    });
  });

  describe('log levels', () => {
    it('should not log below current level', () => {
      const logger = new Logger({ level: 'warn' });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log at and above current level', () => {
      const logger = new Logger({ level: 'info' });

      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should not log anything when level is silent', () => {
      const logger = new Logger({ level: 'silent' });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should log everything when level is debug', () => {
      const logger = new Logger({ level: 'debug' });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should call console.debug with formatted message', () => {
      const logger = new Logger({ level: 'debug', colors: false });
      logger.debug('test debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      const output = consoleSpy.debug.mock.calls[0]?.[0] as string;
      expect(output).toContain('DEBUG');
      expect(output).toContain('test debug message');
    });

    it('should pass additional arguments', () => {
      const logger = new Logger({ level: 'debug', colors: false });
      const obj = { foo: 'bar' };
      logger.debug('message', obj);

      expect(consoleSpy.debug).toHaveBeenCalledWith(expect.any(String), obj);
    });
  });

  describe('info', () => {
    it('should call console.info with formatted message', () => {
      const logger = new Logger({ level: 'info', colors: false });
      logger.info('test info message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      expect(output).toContain('INFO');
      expect(output).toContain('test info message');
    });
  });

  describe('warn', () => {
    it('should call console.warn with formatted message', () => {
      const logger = new Logger({ level: 'warn', colors: false });
      logger.warn('test warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const output = consoleSpy.warn.mock.calls[0]?.[0] as string;
      expect(output).toContain('WARN');
      expect(output).toContain('test warning message');
    });
  });

  describe('error', () => {
    it('should call console.error with formatted message', () => {
      const logger = new Logger({ level: 'error', colors: false });
      logger.error('test error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = consoleSpy.error.mock.calls[0]?.[0] as string;
      expect(output).toContain('ERROR');
      expect(output).toContain('test error message');
    });
  });

  describe('success', () => {
    it('should log success message with checkmark', () => {
      const logger = new Logger({ level: 'info', colors: false });
      logger.success('operation completed');

      expect(consoleSpy.log).toHaveBeenCalled();
      const output = consoleSpy.log.mock.calls[0]?.[0] as string;
      expect(output).toContain('✓');
      expect(output).toContain('operation completed');
    });

    it('should not log when level is above info', () => {
      const logger = new Logger({ level: 'warn' });
      logger.success('operation completed');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('step', () => {
    it('should log step message with arrow', () => {
      const logger = new Logger({ level: 'info', colors: false });
      logger.step('processing file');

      expect(consoleSpy.log).toHaveBeenCalled();
      const output = consoleSpy.log.mock.calls[0]?.[0] as string;
      expect(output).toContain('→');
      expect(output).toContain('processing file');
    });

    it('should not log when level is above info', () => {
      const logger = new Logger({ level: 'warn' });
      logger.step('processing file');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('child', () => {
    it('should create child logger with prefix', () => {
      const logger = new Logger({ level: 'info', colors: false });
      const child = logger.child('parser');

      child.info('parsing started');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      expect(output).toContain('[parser]');
    });

    it('should chain prefixes for nested child loggers', () => {
      const logger = new Logger({ level: 'info', colors: false, prefix: 'bridge' });
      const child = logger.child('parser');

      child.info('parsing started');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      expect(output).toContain('[bridge:parser]');
    });

    it('should inherit parent log level', () => {
      const logger = new Logger({ level: 'warn' });
      const child = logger.child('parser');

      child.info('info message');
      child.warn('warn message');

      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('setLevel', () => {
    it('should change log level dynamically', () => {
      const logger = new Logger({ level: 'info' });

      logger.debug('debug 1');
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      logger.setLevel('debug');
      logger.debug('debug 2');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('setColors', () => {
    it('should enable colors', () => {
      const logger = new Logger({ colors: false });
      logger.setColors(true);
      logger.info('test');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      // Should contain ANSI codes when colors enabled
      expect(output).toContain('\x1b[');
    });

    it('should disable colors', () => {
      const logger = new Logger({ colors: true });
      logger.setColors(false);
      logger.info('test');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      // Should not contain ANSI codes when colors disabled
      expect(output).not.toContain('\x1b[');
    });
  });

  describe('formatting', () => {
    it('should include timestamp in log output', () => {
      const logger = new Logger({ level: 'info', colors: false });
      logger.info('test');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      // Check for ISO timestamp format
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should colorize output when colors enabled', () => {
      const logger = new Logger({ level: 'info', colors: true });
      logger.info('test');

      const output = consoleSpy.info.mock.calls[0]?.[0] as string;
      expect(output).toContain('\x1b[');
      expect(output).toContain('\x1b[0m'); // reset
    });
  });
});

describe('createLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a new Logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should accept configuration', () => {
    const logger = createLogger({ level: 'debug', prefix: 'app' });
    expect(logger).toBeInstanceOf(Logger);
  });
});
