Section 1: CI/CD Overview
- Trigger on pushes to default branch and pull requests for validation.
- Separate CI (build, tests, quality checks) from CD (deployment) for clear responsibility.
- Use environment-scoped deployments for staging then production promotion.
- Gate production with required approvals and protected environment secrets.
- Fail fast on build or test regressions; block deployment on any CI failure.
- Ensure artifacts from build stage are reused across later stages.

Section 2: Workflow Design
| Stage | Trigger | Jobs | Environment |
| --- | --- | --- | --- |
| PR Validation | Pull request events | Install dependencies, build, unit tests, lint/format checks | None |
| Main CI | Push to default branch | Install dependencies, build, unit tests, lint/format checks | None |
| Staging Deploy | Push to default branch after CI success | Deploy release artifact to staging, run smoke checks | Staging |
| Production Deploy | Manual promotion after staging success | Deploy same artifact to production, post-deploy verification | Production |

Section 3: Key Rules & Guarantees
1. Deployment jobs run only after successful CI completion.
2. Production deployment requires explicit approval in the Production environment.
3. The same build artifact is promoted from staging to production to prevent drift.
4. Secrets are scoped to environments and never exposed to non-deployment jobs.
5. Any failed build, test, or quality check blocks downstream stages.
