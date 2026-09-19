# Testing and visual verification

## Unit / integration (Vitest + RTL)

- Test files live in `tests/unit/` with the pattern `*.test.tsx`.
- Test user-visible behavior, not implementation details.
- Use `userEvent` over `fireEvent` for user interactions.
- Mock only at external boundaries (network, browser APIs). Do not mock internal modules.
- Coverage threshold: 70% branches/functions/lines.

## E2E (Playwright)

- Test files live in `e2e/` with the pattern `*.spec.ts`.
- Test critical user paths end-to-end against a running dev server.
- Use `page.getByRole()` and `page.getByText()` selectors (accessibility-first).
- Avoid `page.locator("css selector")` unless no semantic alternative exists.
- `e2e/design-system.spec.mts` runs the contract checks a linter can't settle: touch targets, visible focus, WCAG AA contrast. They come from `@elirobinson/ai-patterns/testing/playwright`. Add a case per route as the app grows. It is `.mts` because the helper is ESM-only and Playwright compiles a plain `.ts` spec to CJS.

## Visual verification

- For any front-end change (component, page, layout, styling), take a screenshot of the affected UI before the change and another after, using the Browser pane / preview tools.
- Attach both screenshots to the PR description (before/after) so reviewers can assess the UI/UX diff without pulling the branch.
- Skip this only when the change has no rendered visual effect (pure logic, types, non-UI server code).
