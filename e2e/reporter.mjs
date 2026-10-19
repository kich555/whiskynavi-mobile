import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { digestTree, sourceDigest } from "../scripts/e2e-cache.mjs";
import { summarize } from "../scripts/e2e-report.mjs";
export default class Reporter {
  attempts = [];
  startedAt = new Date().toISOString();
  async onBegin(config, suite) {
    this.tests = suite.allTests();
    this.sourceFingerprint = sourceDigest();
    this.testFingerprint = digestTree(process.cwd(), [
      "e2e",
      "scripts",
      "playwright.config.ts",
    ]);
    if (process.env.E2E_CODE_COVERAGE === "1") {
      const { browserCoverage } =
        await import("../scripts/browser-coverage.mjs");
      this.coverage = browserCoverage();
      this.coverage.cleanCache();
    }
  }
  onTestEnd(test, result) {
    this.attempts.push({
      title: test.title,
      status: result.status,
      retry: result.retry,
      durationMs: result.duration,
    });
  }
  async onEnd(result) {
    if (this.coverage) {
      const coverage = await this.coverage.generate();
      if (!coverage?.files?.length || !coverage.summary?.lines?.covered)
        return { status: "failed" };
    }
    const routes = JSON.parse(readFileSync("e2e/route-cases.json", "utf8")).map(
      (x) => x.route,
    );
    const report = {
      runId: randomUUID(),
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      commit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      sourceFingerprint: this.sourceFingerprint,
      testFingerprint: this.testFingerprint,
      inputsUnchanged:
        this.sourceFingerprint === sourceDigest() &&
        this.testFingerprint ===
          digestTree(process.cwd(), ["e2e", "scripts", "playwright.config.ts"]),
      discoveredTests: this.tests.length,
      runnerStatus: result.status,
      ...summarize(routes, this.attempts),
      attempts: this.attempts,
    };
    report.complete &&=
      result.status === "passed" &&
      this.attempts.length === this.tests.length &&
      report.inputsUnchanged;
    mkdirSync("artifacts/runs", { recursive: true });
    const contents = JSON.stringify(report, null, 2) + "\n";
    writeFileSync(`artifacts/runs/${report.runId}.json`, contents, {
      flag: "wx",
    });
    writeFileSync("artifacts/e2e-summary.json", contents);
    console.log(
      `Route readiness ${report.coveredRoutes}/${report.routeCount}; first-attempt passes ${report.firstAttemptPassed}/${report.totalAttempts}.`,
    );
    if (process.env.E2E_REQUIRE_FULL === "1" && !report.complete)
      return { status: "failed" };
  }
}
