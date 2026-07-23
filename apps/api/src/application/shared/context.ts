export interface RequestContext {
  tenantId: string;
  actorId: string;
  requestId: string;
  ipAddress?: string;
}

export interface AuditWriter {
  write(event: {
    context: RequestContext;
    action: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface SecretCipher {
  encrypt(plainText: string): Promise<string>;
  decrypt(cipherText: string): Promise<string>;
}
