---
name: miltinson-design
description: Use this skill to generate well-branded interfaces and assets for Miltinson Technologies (the studio of Eli Robinson — builder, consultant, founder), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

<!-- ds-artifacts:managed:begin -->
<!-- Regenerated on every publish from what the tarball actually contains. Do not edit. -->

This skill folder holds: `colors_and_type.css`, `palettes.css`, `mobile.css`, `fonts.css`, `fonts/`, `assets/`, `ui_kits/marketing/`, `ui_kits/webapp/`, `ui_kits/mobile/`, `ui_kits/docs/`, `ui_kits/_shared/`, `README.md`, `SKILL.md`.
Read `README.md` first, then explore the rest.

The brand rules in this skill cover voice, color, type, and visual direction. They do *not*
describe the React component library — for that, read the sibling skill
`.claude/skills/design-system-reference/`, which carries a version-stamped snapshot of every
component and prop table, and run `pnpm ds props <Name>` for the live answer from the
installed package. When the two disagree, the CLI wins.

If creating visual artifacts (slides, mocks, throwaway prototypes, marketing pages, etc),
copy assets out and create static HTML files for the user to view — always link `colors_and_type.css`
and use the wordmark from `assets/`. If working on production code, copy assets and read the
rules in README.md to become an expert in designing with the Miltinson brand.

<!-- ds-artifacts:managed:end -->

Key brand reminders:

- Eli speaks as "I" — never "we"
- Tone: practical, honest, warm, no-fluff
- Color: ink-led with **Miltinson Amber** as the only loud accent; Forest as the secondary anchor
- Type: Geist + JetBrains Mono
- Wordmark: "Miltinson." with the period (in amber)
- Tagline: "Builder. Consultant. Founder." or "Practical tech, honestly built."
- No gradients, no purple, no emoji in primary UI (emoji OK for the Kids Recipes sub-brand only)
- Sharp 4–6px radii, hairline borders, restrained shadows, calm motion
- Accessibility-first: 16px min, 44px touch, WCAG AA, focus-visible rings, reduced-motion honored

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, surface, copy length, variations), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
