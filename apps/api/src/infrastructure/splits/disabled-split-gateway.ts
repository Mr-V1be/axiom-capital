import {
  SplitNetworkStatus,
  SplitProvisioningGateway,
} from "../../domain/settlements/settlement-ports.js";
import { PolicyViolationError } from "../../domain/shared/domain-error.js";

export class DisabledSplitGateway implements SplitProvisioningGateway {
  async status(): Promise<SplitNetworkStatus> {
    return {
      mode: "disabled",
      connected: false,
      factoryDeployed: false,
    };
  }

  async provision(): Promise<never> {
    throw new PolicyViolationError(
      "Splits test network is disabled",
      "splits_disabled",
    );
  }
}
