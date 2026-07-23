export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found`);
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
}

export class PolicyViolationError extends DomainError {
  readonly code = "POLICY_VIOLATION";

  constructor(
    message: string,
    readonly policy: string,
  ) {
    super(message);
  }
}

export class ExternalServiceError extends DomainError {
  readonly code = "EXTERNAL_SERVICE_ERROR";

  constructor(
    readonly service: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message);
    this.cause = options?.cause;
  }
}
