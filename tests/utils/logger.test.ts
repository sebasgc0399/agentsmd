import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('success() logs through console.log and includes the message', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();

    logger.success('generated');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('generated');
  });

  it('info() logs the plain message through console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();

    logger.info('plain message');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('plain message');
  });

  it('warning() logs through console.warn and includes the message', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new Logger();

    logger.warning('careful');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('careful');
  });

  it('error() logs through console.error and includes "Error:" plus message', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger();

    logger.error('failed');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain('Error:');
    expect(String(errorSpy.mock.calls[0][0])).toContain('failed');
  });

  it('verbose() does not log when verbose mode is disabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger(false);

    logger.verbose('details');

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('verbose() logs when verbose mode is enabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger(true);

    logger.verbose('details');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('details');
  });

  it('debug() does not log when verbose mode is disabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger(false);

    logger.debug('ctx', { value: 1 });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('debug() logs label and passes data as second argument when verbose mode is enabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger(true);
    const payload = { ok: true };

    logger.debug('ctx', payload);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('[DEBUG] ctx:');
    expect(logSpy.mock.calls[0][1]).toBe(payload);
  });
});
