# HORIZON — Blue Reference · Controlled Theme Review

## Purpose
Update **visual style only** based on the user's Blue Reference poster. Preserve existing routes, layout structure, interactions, lesson data, learner profiles and application logic.

## Proposed visual tokens
- Navigation blue: `#173D78`
- Primary/action blue: `#2969C8`
- Foreground navy: `#112B59`
- App background: `#F2F6FF`
- Cards: `#FFFFFF`
- Card strokes: `#DCE5F4`
- Optional rose (limited accents): `#FFF0F6`
- Meaningful success stays green `#128363`, errors rose-red `#B43D5A`

## Implementation scope
- Add `horizon-blue.css` **after** the existing component stylesheets.
- Add one CSS link to `index.html`.
- No JavaScript, data, localization, authentication, lessons, DB or routes changed.
- Removal of the single `horizon-blue.css` link reverts the theme without touching feature code.

## UX / Teacher review gates before merge
- Verify visual hierarchy on login, profile selection, dashboard, lesson detail, practice, review, course hub, character and situation libraries.
- No reduction in reading contrast for kana, kanji, romaji, furigana, translated examples or text buttons.
- Green means **correct/success**, red means **wrong/error**; blue means **selected/current**. Audit existing class names relying on `--green`.
- Ensure first-attempt accuracy is not confused with completion rate. Never treat 85% HORIZON practice completion as official JLPT passing threshold.
- Never claim unfinished N5/N4/N3/N2/N1 course content is ready. Keep status explicit.
- Mobile widths 360, 375, 390, 430, 768 px; desktop 1024, 1280, 1440 px; no horizontal overflow.
- Avatar dropdown, language picker, breadcrumb, lesson tabs, nav, modal, keyboard focus, reduced-motion, and disabled buttons retain behavior.
- Run original automated app tests and check saved learner state after CSS change.

## Visual references / limitations
- Source poster is an **illustrative concept**; its generated text, character identities, UI copy and “approved” stamp are not project acceptance evidence.
- The separately delivered interactive HTML preview illustrates the intended UI direction; it is not the production application.
- This PR is intentionally **draft**. Do not merge/deploy until PC and iPhone visual acceptance is completed.
