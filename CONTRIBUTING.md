# Contributing

1. Create a focused branch and keep each commit limited to one reviewable change.
2. Run `node scripts/security-check.mjs`, `node scripts/verify.mjs` and `node scripts/audit.mjs`.
3. Add regression coverage for defects and failure paths, including database rollback where relevant.
4. Do not commit credentials, customer data, internal URLs or machine-specific absolute paths.
5. Update CHANGELOG.md for user-visible behavior changes.
6. Open a pull request using the repository template and wait for CI and CodeQL to pass.