import type {
  AccountListDto,
  AccountDetailsDto,
  BatchOrderDto,
  CancelBatchOrderInput,
  ConnectAccountInput,
  CreateSettlementInput,
  InvestorAccountDto,
  PlaceBatchOrderInput,
  PortfolioOverviewDto,
  SettlementDto,
} from "@axiom/contracts";
import { SessionStore } from "../auth/session-store";
import { DataGateway } from "./data-gateway";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class HttpDataGateway implements DataGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly session: SessionStore,
  ) {}

  getPortfolioOverview(signal?: AbortSignal) {
    return this.request<PortfolioOverviewDto>("/v1/portfolio/overview", {
      ...(signal ? { signal } : {}),
    });
  }

  listAccounts(signal?: AbortSignal) {
    return this.request<AccountListDto>("/v1/accounts", {
      ...(signal ? { signal } : {}),
    });
  }

  getAccountDetails(accountId: string, signal?: AbortSignal) {
    return this.request<AccountDetailsDto>(
      `/v1/accounts/${accountId}/details`,
      { ...(signal ? { signal } : {}) },
    );
  }

  connectAccount(input: ConnectAccountInput) {
    return this.request<InvestorAccountDto>("/v1/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  syncAccount(accountId: string) {
    return this.request<InvestorAccountDto>(`/v1/accounts/${accountId}/sync`, {
      method: "POST",
    });
  }

  placeBatchOrder(input: PlaceBatchOrderInput) {
    return this.request<BatchOrderDto>("/v1/orders/batch", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  syncBatchOrder(batchId: string) {
    return this.request<BatchOrderDto>(`/v1/orders/${batchId}/sync`, {
      method: "POST",
    });
  }

  cancelBatchOrder(batchId: string, input: CancelBatchOrderInput) {
    return this.request<BatchOrderDto>(`/v1/orders/${batchId}/cancel`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listSettlements(signal?: AbortSignal) {
    return this.request<{ items: SettlementDto[] }>("/v1/settlements", {
      ...(signal ? { signal } : {}),
    });
  }

  createSettlement(input: CreateSettlementInput) {
    return this.request<SettlementDto>("/v1/settlements", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const token = this.session.getSnapshot().accessToken;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;
      throw new ApiError(
        response.status,
        body?.code ?? "HTTP_ERROR",
        body?.message ?? "Request failed",
      );
    }
    return response.json() as Promise<T>;
  }
}
