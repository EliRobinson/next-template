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
- Assert behavior with roles and text. Never compare screenshots here; see Screenshot regression below. ESLint blocks `toHaveScreenshot()` in `e2e/`.
- Use `page.getByRole()` and `page.getByText()` selectors (accessibility-first).
- Avoid `page.locator("css selector")` unless no semantic alternative exists.
- `e2e/design-system.spec.mts` runs the contract checks a linter can't settle: touch targets, visible focus, WCAG AA contrast. They come from `@elirobinson/ai-patterns/testing/playwright`. Add a case per route as the app grows. It is `.mts` because the helper is ESM-only and Playwright compiles a plain `.ts` spec to CJS.

## Screenshot regression (Playwright component tests)

Screenshot tests catch unintended visual change in one component at a time. They run with `@playwright/experimental-ct-react` and `toHaveScreenshot()`, separate from the E2E suite.

- Test files live in `tests/visual/` with the pattern `*.visual.tsx`. Config: `playwright-ct.config.ts`. Baselines live next to the tests in `tests/visual/__screenshots__/` and are committed.
- `pnpm test:visual` runs them. `pnpm test:visual:update` rewrites the baselines. Both need Docker running.
- `scripts/visual-test.sh` starts Linux Chromium in the Playwright Docker image and runs the tests against it, so every machine renders the same pixels. The config refuses any other browser. Never make baselines any other way. `VISUAL_NATIVE=1` skips Docker only when the run is already inside the Playwright image.
- The harness (`tests/visual/harness/`) loads `src/app/styles.ts`, the same stylesheets as the app.
- A failure writes the expected, actual, and diff images to `test-results-visual/`. `pnpm exec playwright show-report playwright-report-visual` shows them side by side.
- The pre-push hook runs `pnpm test:visual`, so a push needs Docker running.

### When to write one

Use a screenshot test when the thing under test is how a component looks, and no role or text assertion can say it:

- Each visual state of a component this repo owns: variants, sizes, empty, loading, error, disabled.
- Both themes for any component with color. Loop over `themes` from `tests/visual/themes.ts` and pass `hooksConfig: { theme }` to `mount`; the harness sets `data-theme` before each mount.
- Layout edge cases: long text, wrapping, overflow, many items, no items.
- A visual bug you fixed. Lock the fix with a screenshot of the state that broke.

Do not use one for:

- Behavior. Clicks, navigation, form rules, and data belong in Vitest + RTL or E2E, asserted with roles and text.
- Full pages, E2E flows, or integration tests. They pull in live data, fonts loading late, and layout from many components, so they drift on every unrelated change.
- Design system components on their own. `@elirobinson/react` tests its own look upstream. Test this repo's composition of them.
- Anything that shows time, random values, or remote content. Pass fixed props instead, or cover the part with `mask`.

### Rules for a stable test

- Mount the smallest component that shows the state, with fixed props. No network, no dates, no random IDs.
- Screenshot the component locator (`expect(component).toHaveScreenshot()`), not the page.
- Set the viewport with `test.use({ viewport })` so layout does not depend on the default. Keep widths clear of Tailwind breakpoints, and add a case on each side of any breakpoint the component responds to.
- Name every snapshot (`toHaveScreenshot('card-error-dark.png')`). One snapshot per state.
- Wait with web-first assertions (`await expect(...).toBeVisible()`), never `waitForTimeout`.
- Keep the default comparison threshold. A flaky screenshot has a cause: an animation, a font, live data. Fix the cause. Raising `maxDiffPixels` or `threshold` to get green hides the next real regression.
- Animations are off and the caret is hidden in the config. Do not turn them back on.

### Updating baselines

- Update baselines only for a change you meant to make. Read the diff image first. If you cannot say why a pixel moved, do not update.
- Commit the new baselines in the same commit as the code that changed them.
- Delete the baseline of a test you delete.

## Visual verification in pull requests

Committed baselines are the before and after. A PR that changes how a component looks changes its baseline PNGs, and GitHub shows each one as an image diff (2-up, swipe, onion skin). Reviewers see the change without pulling the branch.

- A UI change to a component with a screenshot test: update the baselines and let the PR diff show the change.
- A UI change to a component without one: add a screenshot test if the change is a component state (see above). If it is not, check it in the Browser pane and paste the screenshots into the PR description.
- Do not write screenshots into `docs/` or anywhere else in the repo. A committed image that no test reads goes stale and nothing tells anyone.

A change with no rendered visual effect (pure logic, types, non-UI server code) needs no visual check.
