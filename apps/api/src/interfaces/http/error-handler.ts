import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { DomainError } from "../../domain/shared/domain-error.js";

const statusByCode: Readonly<Record<string, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_ACCOUNT: 422,
  INVALID_SETTLEMENT: 422,
  POLICY_VIOLATION: 422,
  EXTERNAL_SERVICE_ERROR: 502,
};

export function errorHandler(
  error: FastifyError | DomainError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(
    { err: error, requestId: request.id },
    "Request failed",
  );

  if ("validation" in error && error.validation) {
    void reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      requestId: request.id,
    });
    return;
  }

  if (error instanceof DomainError) {
    const isExternal = error.code === "EXTERNAL_SERVICE_ERROR";
    void reply.status(statusByCode[error.code] ?? 400).send({
      code: error.code,
      message: isExternal ? "External service request failed" : error.message,
      requestId: request.id,
    });
    return;
  }

  void reply.status(500).send({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    requestId: request.id,
  });
}
