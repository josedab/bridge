/**
 * Simple logging utility with levels and formatting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/** ANSI color codes */
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/** Logger configuration */
interface LoggerConfig {
  level: LogLevel;
  colors: boolean;
  prefix?: string;
}

/** Logger instance */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? 'info',
      colors: config.colors ?? process.stdout.isTTY ?? false,
      prefix: config.prefix,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private colorize(text: string, color: keyof typeof colors): string {
    if (!this.config.colors) return text;
    return `${colors[color]}${text}${colors.reset}`;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}] ` : '';

    let levelStr: string;
    switch (level) {
      case 'debug':
        levelStr = this.colorize('DEBUG', 'dim');
        break;
      case 'info':
        levelStr = this.colorize('INFO', 'blue');
        break;
      case 'warn':
        levelStr = this.colorize('WARN', 'yellow');
        break;
      case 'error':
        levelStr = this.colorize('ERROR', 'red');
        break;
      default:
        levelStr = level.toUpperCase();
    }

    return `${this.colorize(timestamp, 'dim')} ${levelStr} ${prefix}${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  /** Log a success message */
  success(message: string): void {
    if (this.shouldLog('info')) {
      const symbol = this.colorize('✓', 'green');
      console.log(`${symbol} ${message}`);
    }
  }

  /** Log a progress step */
  step(message: string): void {
    if (this.shouldLog('info')) {
      const symbol = this.colorize('→', 'cyan');
      console.log(`${symbol} ${message}`);
    }
  }

  /** Create a child logger with a prefix */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /** Set the log level */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /** Enable or disable colors */
  setColors(enabled: boolean): void {
    this.config.colors = enabled;
  }
}

/** Default logger instance */
export const logger = new Logger();

/** Create a new logger with custom configuration */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
