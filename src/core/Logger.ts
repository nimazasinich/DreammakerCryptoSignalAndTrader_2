// Browser-compatible Logger (no fs module)
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  module?: string;
  error?: Error;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

export class Logger {
  private static instance: Logger;
  private logBuffer: string[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private correlationId: string = '';
  private maxBufferSize: number = 1000;

  private constructor() {
    // Browser-compatible constructor - no file system access
    // All logging goes to console and in-memory buffer
  }

  private async initNodeLogger() {
    // Skip file logging in browser - only use console
    // File logging is only available in Node.js backend
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      correlationId: this.correlationId || this.generateCorrelationId(),
      module: this.getCallerModule(),
      error
    };

    const logLine = JSON.stringify(entry) + '\n';
    
    // Store in buffer (works in both browser and Node.js)
    this.logBuffer.push(logLine);
    if ((this.logBuffer?.length || 0) > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }
    
    // Always log to console
    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` | Error: ${error.message}\n${error.stack}` : '';
    
    console.log(`[${timestamp}] [${levelName}] [${entry.correlationId}] ${message}${contextStr}${errorStr}`);
  }

  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getCallerModule(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Skip current function and log function
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/at .* \((.+):(\d+):(\d+)\)/);
      if (match) {
        const filePath = match[1];
        return filePath.split('/').pop() || 'unknown';
      }
    }
    return 'unknown';
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  close(): void {
    // No file streams to close in browser-compatible version
    this.logBuffer = [];
  }

  // Browser-specific method to get logs
  getLogs(): string[] {
    return [...this.logBuffer];
  }

  // Browser-specific method to clear logs
  clearLogs(): void {
    this.logBuffer = [];
  }
}