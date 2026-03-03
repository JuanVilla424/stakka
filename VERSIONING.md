# 📦 Versioning Strategy

We follow [Semantic Versioning](https://semver.org/) with the version format `MAJOR.MINOR.PATCH`. This approach helps in managing releases and ensuring compatibility across different versions of our project.

## 🧩 Version Components

- **MAJOR:** Increments when you make incompatible API changes.
- **MINOR:** Increments when you add functionality in a backward-compatible manner.
- **PATCH:** Increments when you make backward-compatible bug fixes.

## 🌿 Branch Workflow

Our repository uses the following branches to manage the development and release process:

1. **dev:** Active development happens here. New features and bug fixes are merged into this branch.
2. **main:** The `main` branch holds the latest production-ready code. Releases are tagged from this branch and auto-deployed to GitHub Pages.

## 📝 Commit Message Guidelines

To automate versioning and changelog generation, it's essential to follow specific commit message conventions. Each commit message should include one of the following [commit types](#-commit-types) and an optional scope. Additionally, include one of the [versioning keywords](#-versioning-keywords) to indicate the type of version bump.

### 🗂️ Commit Message Structure

```bash
<type>(<scope>): <description> [versioning keyword]
```

Example:

```bash
feat(core): add t-spin detection [minor candidate]
```

### 🔤 Commit Types

- **feat**: A new feature for the user.
- **fix**: A bug fix for the user.
- **docs**: Documentation only changes.
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.).
- **refactor**: A code change that neither fixes a bug nor adds a feature.
- **perf**: A code change that improves performance.
- **test**: Adding missing tests or correcting existing tests.
- **chore**: Changes to the build process or auxiliary tools and libraries.

### 🔑 Versioning Keywords

**Optionally** Include one of the following keywords at the end of the commit message to indicate the type of version bump:

- **[major candidate]** Indicates that this commit should trigger a MAJOR version bump.
- **[minor candidate]** Indicates that this commit should trigger a MINOR version bump.
- **[patch candidate]** Indicates that this commit should trigger a PATCH version bump.

Examples:

- `feat(core): add combo system [minor candidate]`
- `fix(core): resolve collision detection error [patch candidate]`
- `refactor(core): restructure game state machine [major candidate]`

## 🚀 Release Process

1. Development Phase:
   - Developers work on features and bug fixes in the `dev` branch.
   - Commit messages should follow the guidelines above to indicate the type of changes.

2. Release:
   - Changes from `dev` are merged into `main`.
   - A release is tagged, and the `CHANGELOG.md` is updated based on commit messages.
   - GitHub Actions automatically deploys to GitHub Pages on push to `main`.

## ⭐ Best Practices

- **Atomic Commits**: Ensure each commit represents a single logical change.
- **Descriptive Messages**: Write clear and concise commit messages that accurately describe the changes.
- **Consistent Format**: Adhere strictly to the commit message structure to enable automation tools to function correctly.
- **Avoid Force Pushes**: Respect branch protection rules to maintain repository integrity.

---

## 📜 License

2026 - This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software under the terms of the MIT license. For more details, please refer to the [LICENSE](LICENSE) file included in this repository.
