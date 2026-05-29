---
name: opensource-readme
description: Transforms a project's README into an open-source-ready format by auditing existing content and adding missing standard sections: License, Contributing, Code of Conduct, Badges, Installation, Usage, Roadmap, and Acknowledgements. Use when user wants to open-source a project, make a README complete, prepare a repo for public release, or asks to "add open source sections", "make this open source ready", or "improve the README".
---

# Open Source README

Audit and enhance a README so it meets open-source community standards. Preserve all existing content — only add or expand, never remove.

## Standard sections (in order)

| Section | Required | Notes |
|---|---|---|
| Badges | Recommended | License, CI status, version |
| Description | Required | 1–2 sentence tagline |
| Table of Contents | If README > 80 lines | |
| Installation | Required | |
| Usage | Required | At least one example |
| Contributing | Required | |
| Code of Conduct | Required | |
| License | Required | |
| Roadmap | Optional | |
| Acknowledgements | Optional | |

## Workflow

1. Read the existing README
2. Check for `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` files in repo root
3. Identify which sections are missing or thin
4. Add missing sections at the bottom in the order above
5. If a standalone file exists (e.g. `CONTRIBUTING.md`), link to it instead of inlining
6. For License: check LICENSE file for the license type; default to MIT if absent
7. For badges: add at least a license badge after the title

## Section templates

### Contributing
```md
## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: describe change'`)
4. Push and open a pull request

Please make sure tests pass before submitting a PR.

Code of Conduct

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold a welcoming, harassment-free environment.

License

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

License badge (top of README, after title)

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Rules

- Never delete or reorder existing sections
- Match the heading style already used (# vs ##)
- If the repo has no LICENSE file, note that one should be created and suggest MIT
- Keep all additions concise — link out rather than inline large docs
