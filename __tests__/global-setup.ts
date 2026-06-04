import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

import type { TestProject } from "vitest/node";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

const POSTGRES_IMAGE = "postgres:16-alpine";
const DB_NAME = "kickcollect_test";
const DB_USER = "kickcollect";
const DB_PASSWORD = "kickcollect";
const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const TEST_DB_URL_PATH = path.join(WORKSPACE_ROOT, ".test-database-url");

function getPrismaCliPath(): string {
  return path.resolve(WORKSPACE_ROOT, "node_modules", "prisma", "build", "index.js");
}

function buildPrismaEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    POSTGRES_PRISMA_URL: databaseUrl,
    POSTGRES_URL: databaseUrl,
    POSTGRES_URL_NON_POOLING: databaseUrl,
  };
}

function runPrismaCommand(args: string[], databaseUrl: string): void {
  execFileSync(process.execPath, [getPrismaCliPath(), ...args], {
    cwd: WORKSPACE_ROOT,
    stdio: "inherit",
    env: buildPrismaEnv(databaseUrl),
  });
}

function buildDatabaseUrl(container: StartedTestContainer): string {
  const host = container.getHost();
  const port = container.getMappedPort(5432);
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${host}:${port}/${DB_NAME}?schema=public`;
}

async function setupTestDatabaseContainer(): Promise<StartedTestContainer> {
  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_DB: DB_NAME,
      POSTGRES_USER: DB_USER,
      POSTGRES_PASSWORD: DB_PASSWORD,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
    .start();

  return container;
}

export default async function globalSetup(_project: TestProject): Promise<() => Promise<void>> {
  const container = await setupTestDatabaseContainer();
  const databaseUrl = buildDatabaseUrl(container);

  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  process.env.POSTGRES_PRISMA_URL = databaseUrl;
  process.env.POSTGRES_URL = databaseUrl;
  process.env.POSTGRES_URL_NON_POOLING = databaseUrl;

  writeFileSync(TEST_DB_URL_PATH, databaseUrl, "utf8");

  runPrismaCommand(["migrate", "deploy"], databaseUrl);

  return async () => {
    await container.stop();
    writeFileSync(TEST_DB_URL_PATH, "", "utf8");
  };
}
