import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3010";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(baseURL) && process.env.E2E_VALIDATION_AUTHORIZED !== "YES") {
  throw new Error("Une cible distante exige E2E_VALIDATION_AUTHORIZED=YES et une validation d’isolation préalable.");
}

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
