# Contributing to NewsAI

Thank you for considering contributing to NewsAI! 🎉

## Getting Started

1. **Fork** the repository and clone your fork
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Follow the [Installation Guide](README.md#-installation--setup) to set up your local environment
4. Make your changes
5. Run lints and tests:
   ```bash
   # Backend
   cd backend
   ruff check app/
   pytest app/tests/ -v

   # Frontend
   cd frontend
   npm run lint
   npx tsc --noEmit
   npm run test
   ```
6. Commit with meaningful messages (see below)
7. Push and open a Pull Request

## Commit Messages

Follow the **Conventional Commits** format:

```
<type>(<scope>): <short description>

[optional longer description]
```

| Type       | When to use                          |
|------------|--------------------------------------|
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation only                   |
| `refactor` | Code change that doesn't fix/add     |
| `test`     | Adding or updating tests             |
| `ci`       | CI/CD pipeline changes               |
| `chore`    | Maintenance (deps, config, etc.)     |

Examples:
- `feat(ai): add fact-check agent node to LangGraph pipeline`
- `fix(auth): prevent refresh token reuse after rotation`
- `docs: update README with architecture diagram`

## Code Style

### Backend (Python)
- **Linter**: [Ruff](https://docs.astral.sh/ruff/) — run `ruff check app/`
- **Formatter**: Follow PEP 8 conventions
- **Logging**: Use `logging.getLogger("app.<module>")` — **never** use `print()` for errors or warnings
- **Type hints**: Use them on all function signatures
- **Async**: Prefer `async/await` over synchronous blocking calls

### Frontend (TypeScript/React)
- **Linter**: ESLint — run `npm run lint`
- **Types**: Strict TypeScript — run `npx tsc --noEmit`
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS + Shadcn UI component library

## Pull Request Guidelines

1. **One feature/fix per PR** — keep PRs focused
2. **Write tests** for new features
3. **Update docs** if your change affects the README or API
4. **Don't break the build** — ensure CI passes before requesting review
5. **Screenshots** for UI changes

## Project Structure

```
news-app-2.0/
├── .github/workflows/   # CI/CD pipelines
├── backend/
│   ├── app/
│   │   ├── api/         # FastAPI route handlers
│   │   ├── core/        # Config, auth, cache, logging
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic & AI agents
│   │   └── tests/       # Pytest test suite
│   ├── alembic/         # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Route pages
│   │   ├── context/     # React contexts (Auth, Wallet)
│   │   └── hooks/       # Custom hooks
│   └── package.json
└── docker-compose.yml   # Full-stack Docker setup
```

## Reporting Bugs

Open an [issue](https://github.com/Atharva0506/news-app/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS/Node/Python version

## Feature Requests

Open an issue with `[Feature]` prefix. Include:
- Problem the feature solves
- Proposed solution
- Alternatives considered

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
