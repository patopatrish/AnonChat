import { randomUUID } from "crypto";

export type LogLevel = "info" | "warn" | "error";

export interface BlockchainLogContext {
  groupId?: string;
  metadataHash?: string;
  transactionHash?: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  [key: string]: any;
}

export interface BlockchainLog {
  timestamp: string;
  level: LogLevel;
  operation: string;
  correlationId: string;
  context: BlockchainLogContext;
}

/**
 * Generates a unique correlation ID for tracing operations
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Logs blockchain operations with structured format
 * 
 * @param level - Log level (info, warn, error)
 * @param operation - Description of the operation
 * @param context - Additional context data
 * @param correlationId - Optional correlation ID for tracing
 */
export function logBlockchainOperation(
  level: LogLevel,
  operation: string,
  context: BlockchainLogContext,
  correlationId?: string
): void {
  const log: BlockchainLog = {
    timestamp: new Date().toISOString(),
    level,
    operation,
    correlationId: correlationId || generateCorrelationId(),
    context,
  };

  const logMessage = `[Blockchain ${level.toUpperCase()}] ${operation}`;
  const logData = JSON.stringify(log, null, 2);

  switch (level) {
    case "info":
      console.log(logMessage, logData);
      break;
    case "warn":
      console.warn(logMessage, logData);
      break;
    case "error":
      console.error(logMessage, logData);
      break;
  }
}
