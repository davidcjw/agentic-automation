# Development Workflow

- Always run linting or tests if there are any before you determine if a feature is ready
- For any git repo that is (or will be) pushed to GitHub, if `.github/workflows/` has no CI workflow, scaffold one by copying `~/.claude/templates/ci.yml` to `.github/workflows/ci.yml`. Adjust `node-version` / package manager to match the repo, but keep the `--if-present` steps. Do this as part of the same pass when creating a new repo or first pushing to GitHub — do not leave repos without CI.
