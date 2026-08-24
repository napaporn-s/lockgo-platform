/**
 * LOCKGO — Standard Domain & Error Classes
 */

export class LockGoError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CompartmentNotAvailableError extends LockGoError {
  constructor(compartmentId: string) {
    super(`Compartment ${compartmentId} is not available for reservation`, 'COMPARTMENT_NOT_AVAILABLE', 409);
  }
}

export class LockContentionError extends LockGoError {
  constructor(resource: string) {
    super(`Resource ${resource} is currently locked by another concurrent process`, 'LOCK_CONTENTION', 409);
  }
}

export class InvalidSecurityTokenError extends LockGoError {
  constructor(reason: string) {
    super(`Invalid security token: ${reason}`, 'INVALID_SECURITY_TOKEN', 401);
  }
}

export class TokenAlreadyConsumedError extends LockGoError {
  constructor(nonce: string) {
    super(`Security token nonce ${nonce} has already been consumed (Replay Attack blocked)`, 'TOKEN_ALREADY_CONSUMED', 409);
  }
}

export class HardwareCommunicationError extends LockGoError {
  constructor(stationId: string, reason: string) {
    super(`Hardware communication failed with station ${stationId}: ${reason}`, 'HARDWARE_COMMUNICATION_ERROR', 503);
  }
}

export class HardwareJammedError extends LockGoError {
  constructor(compartmentId: string) {
    super(`Hardware sensor detected door jam on compartment ${compartmentId}`, 'HARDWARE_JAMMED', 500);
  }
}

export class ResourceNotFoundError extends LockGoError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} was not found`, 'RESOURCE_NOT_FOUND', 404);
  }
}
