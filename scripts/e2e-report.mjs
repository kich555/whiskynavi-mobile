export function summarize(routes, attempts) {
  const passed = attempts.filter((a) => a.status === "passed" && a.retry === 0);
  const missingRoutes = routes.filter(
    (route) => !passed.some((a) => a.title === `route: ${route}`),
  );
  const failed = attempts.filter((a) => a.status !== "passed" || a.retry !== 0);
  return {
    scope:
      "RN web preview: route readiness and selected user journeys; not source branch or native coverage",
    totalAttempts: attempts.length,
    firstAttemptPassed: passed.length,
    failedOrRetried: failed.length,
    routeCount: routes.length,
    coveredRoutes: routes.length - missingRoutes.length,
    routeCoveragePercent: routes.length
      ? (100 * (routes.length - missingRoutes.length)) / routes.length
      : 0,
    missingRoutes,
    complete: attempts.length > 0 && !missingRoutes.length && !failed.length,
  };
}
