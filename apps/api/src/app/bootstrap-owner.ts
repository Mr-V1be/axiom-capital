import { AppConfig } from "../infrastructure/config/app-config.js";
import { Database } from "../infrastructure/persistence/prisma-client.js";

export async function bootstrapOwner(
  db: Database,
  config: AppConfig,
): Promise<void> {
  if (config.auth.mode !== "basic") return;
  await db.$transaction([
    db.tenant.upsert({
      where: { id: config.auth.tenantId },
      create: { id: config.auth.tenantId, name: "Axiom Fund" },
      update: {},
    }),
    db.user.upsert({
      where: {
        tenantId_email: {
          tenantId: config.auth.tenantId,
          email: `${config.auth.username}@local.axiom`,
        },
      },
      create: {
        id: config.auth.actorId,
        tenantId: config.auth.tenantId,
        email: `${config.auth.username}@local.axiom`,
        name: config.auth.username,
        role: "owner",
      },
      update: {
        name: config.auth.username,
        role: "owner",
      },
    }),
  ]);
}
