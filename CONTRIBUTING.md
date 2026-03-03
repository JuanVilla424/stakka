# 🤝 Contributing to stakka

We welcome contributions to stakka! To make sure the process goes smoothly, please follow these guidelines:

## 📋 Code of Conduct

Please note that all participants in our project are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Make sure to review it before contributing.

## 🛠 How to Contribute

1. **Fork the repository**:
   Fork the project to your GitHub account using the GitHub interface.

2. **Create a new branch**:
   Use a descriptive branch name for your feature or bugfix:

   git checkout -b feature/your-feature-name

3. **Make your changes**:
   Implement your feature or fix the bug in your branch. Make sure to include tests where applicable and follow coding standards.

4. **Test your changes**:
   Run the test suite to ensure your changes don't break any functionality:

   npm run test

5. **Commit your changes**:
   Use meaningful commit messages that explain what you have done:

   git commit -m "feat(core): add feature description"

6. **Push your changes**:
   Push your changes to your fork:

   git push origin feature/your-feature-name

7. **Submit a Pull Request**:
   Create a pull request on the main repository, detailing the changes you've made. Link any issues your changes resolve and provide context.

## 📑 Guidelines for Contributions

- **Lint your code** before submitting a pull request. We use [ESLint](https://eslint.org/) for linting:

  npx eslint src/

- Ensure **test coverage** for your code. Uncovered code may delay the approval process.
- Write clear, concise **commit messages** following the format `type(core): description`.

Thank you for helping improve stakka!

---

## 📜 License

2026 - This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software under the terms of the MIT license. For more details, please refer to the [LICENSE](LICENSE) file included in this repository.
