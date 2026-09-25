# Nizhalpoocha — Visual System

One look for every screen: **a Kerala monsoon night**. Deep forest greens and wet
darkness, lit by warm oil-lamp gold, with the kasavu (gold saree border) as our
signature edge. Mysterious and cinematic, but chunky, friendly and playful.

## Tokens (`web/styles/globals.css` `@theme`)

| Token | Use |
| --- | --- |
| `ink` `#09130f` | deepest background, input wells, scrims |
| `night` `#0e1b16` | page background |
| `panel` / `panel-2` | raised surfaces / secondary buttons, list rows |
| `line` / `line-strong` | 1.5–2px strokes |
| `moss` / `moss-deep` | primary positive action (+ its lip) |
| `leaf` | success text, online dots, "good" |
| `lamp` / `gold-deep` | the most important action, selection, highlights, kasavu |
| `laterite` / `laterite-deep` | danger, kills, leave, errors |
| `canal` / `canal-deep` | info, secondary highlight (how to play, meetings) |
| `paper` / `mist` / `rain` | text: primary / secondary / muted |

**Never** hard-code hex colours in components (the only exceptions are canvas/SVG
art and brand marks like the Google "G"). No violet, no neon blue, no pure black/white.

## Type

- `font-display` = **Baloo Chettan 2** (Latin + Malayalam in one family) — titles, buttons, labels, numbers.
- body = **Manrope** with Baloo Chettan 2 as the Malayalam fallback.
- `.headline` = chunky outlined title (screen titles, big moments). Use for ≤ 1 line per block.
- Malayalam is ~1.2× taller: never fix heights on text containers — use `min-h-*`, `leading-tight`, allow wrapping.

## Shape & surface

- Radius: cards/panels `rounded-[var(--radius-card)]` (1.25rem); buttons `rounded-2xl` (sm: `rounded-xl`); chips & icon buttons `rounded-full`.
- Strokes: 1.5px (`.surface`) or 2px (`border-2`) only.
- `.surface` — the one panel style (subtle top light, line border, soft shadow). No glassmorphism, no `backdrop-blur`.
- `.kasavu` — gold double line on the top edge. Use on **dialogs, hero panels, error states** only (≈1 per screen).
- `.tactile` — every pressable: darker 4px bottom lip, lifts on hover, compresses on press, desaturates when disabled.

## Components (`web/components/ui`)

- `Button` variants: `gold` (single most important action per screen), `primary` (moss), `teal`, `secondary`, `danger`, `ghost`. Sizes `sm|md|lg`. Has `loading`, `icon`, `full`.
- `IconButton` — round, always has `label` (aria). Back buttons use a chevron.
- `Panel` (`kasavu` prop), `SectionTitle`, `Field`, `Toggle` (`hint`), `Stepper`, `Segmented`, `ChoiceCard` (radio card with gold selected state), `Badge` (`neutral|gold|good|danger|info`), `Spinner` (blinking cat eyes), `Modal` (Esc closes).
- `Screen` — every menu screen: animated backdrop, round back button, headline title + kasavu underline, `animate-screen-in` content.
- Feedback: `Toasts` (tone bar + icon), `Notice` (inline form/panel message), `ErrorState`, `EmptyState`.
- `CharacterAvatar` — `mood` (`neutral|happy|suspicious|scared|sly|blink`) and `blink` idle. Mood is **cosmetic only; never derive it from a role**.
- `MonsoonBackdrop` / `Logo` — shared calm animated background & the title logo.

## States

| State | Treatment |
| --- | --- |
| hover | `-1px` lift, brightness 1.06 (`.tactile`) or border → `lamp/60` |
| pressed | `translateY(2px)`, lip 4px → 2px |
| selected | `border-lamp` + gold check / `bg-lamp text-ink` chip |
| disabled | desaturated + `cursor-not-allowed` (never just hidden) |
| focus | 2px gold outline (global `:focus-visible`) |
| loading | `Spinner` (cat eyes) or `Button loading`; full screens use `LoadingScreen` |
| error | `Notice tone="danger"` inline, `ErrorState` full, `toast(…, 'danger')` transient |
| empty | `EmptyState` with an illustration (avatar/CatForm) + next step |

## Motion

`animate-screen-in` (screen entrance), `animate-rise`, `animate-idle` (character bob),
`animate-eyes`, `loader-eye`, kill keyframes (`kill-vignette`, `kill-pounce`, `kill-fall`,
`kill-mask-off`, `kill-cat-on`). Keep durations 120–400ms for UI, ≤2.3s for cutscenes.
Everything respects `prefers-reduced-motion`.

## Hidden-role safety (visual)

The Cat looks exactly like a villager in every shared view. The cat form (`CatForm`)
appears only: in the role reveal to the Cat itself, in the killer's own private
`KillScene`, after a confirmed ejection, and at the end-of-match reveal. The victim's
kill scene is anonymous.

## Layout

Mobile-first; 16px gutters; `pt-safe pb-safe` on full screens; gameplay HUD is
landscape. Menu content max width `max-w-xl` (wide screens `max-w-5xl`). Primary
action at the bottom of a flow, full width on phones.
