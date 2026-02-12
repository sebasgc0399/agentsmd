/**
 * CLI logging utilities for consistent output
 */

export class Logger {
  constructor(private isVerbose: boolean = false) {}

  success(message: string): void {
    console.log(`✓ ${message}`);
  }

  error(message: string): void {
    console.error(`✗ Error: ${message}`);
  }

  warning(message: string): void {
    console.warn(`⚠ ${message}`);
  }

  info(message: string): void {
    console.log(message);
  }

  verbose(message: string): void {
    if (this.isVerbose) {
      console.log(`→ ${message}`);
    }
  }

  debug(label: string, data: unknown): void {
    if (this.isVerbose) {
      console.log(`[DEBUG] ${label}:`, data);
    }
  }
}
