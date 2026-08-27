# 18 — UI components: shadcn shape, real error states

**Status:** done
**Depends on:** 17
**Phase:** 0
**Pain point:** 05

## Goal

Task 17 built a proper error vocabulary and a copy layer. The UI still throws
most of it away: errors are flattened into strings, rendered in neutral ink,
never attached to the field that caused them, and — in the booking flow —
not rendered at all. The user gets a greyed-out button and no explanation.

Two outcomes, in priority order:

1. **Every failure is visible at the place it happened.** A field that is
   wrong says so, next to itself, in the user's language, with the aria
   wiring that makes a screen reader say it too.
2. **The primitives are shadcn components** — cva variant maps, `asChild`,
   semantic CSS-variable tokens, `components.json` — so `bunx shadcn add`
   works and every future primitive lands in one shape instead of being
   hand-rolled a seventh time.

The second exists to serve the first. A one-off error style added to one
form is how the current state happened; a variant on a shared primitive is
how it stops.

> **A control that rejects input must say what it wants.** Disabling a button
> is not an error message.

## Current state (verified)

### The primitives have no invalid state at all

`src/components/ui/` is seven files and 143 lines:

| file | what's missing |
|---|---|
| `field.tsx:13` | no `error`, no `required`, no `aria-invalid`, no `aria-describedby` |
| `control.ts:3` | `CONTROL_CLASS` has focus styles, no invalid styles |
| `input.tsx:4`, `textarea.tsx:4`, `select.tsx:4` | pass-through; nothing to set |
| `button.tsx:15` | no `loading`, no `asChild`; `VARIANTS`/`SIZES` are plain objects, not cva |
| `search-field.tsx:19` | no error slot |

So there is **no way to mark a field wrong**, which is why no form does.

### Errors are flattened to strings and lose both structure and translation

`ErrorPanel` (`src/components/error-panel.tsx:11-15`) is the only component
that calls `t()` on error copy. Five call sites bypass it by collapsing an
`AppError` into a bare string first:

- `action-form.tsx:80` — `` `${appError.detail} ${appError.action}` ``
- `wallet-panel.tsx:29-32` — same, via `formatError`
- `profile-panel.tsx:20-22` — same
- `track.tsx:47-48` — same
- `login.tsx:58,67,85,97,120,126,146,151` — `.detail` only; **the action is
  discarded**, so the one sentence telling the user what to do is dropped

Those strings then render through four near-identical hand-rolled blocks —
`login.tsx:380`, `wallet-panel.tsx:262`, `profile-panel.tsx:419`,
`track.tsx:107` — and three success twins (`login.tsx:385`,
`wallet-panel.tsx:267`, `profile-panel.tsx:425`). Seven copies of two
components.

`action-form.tsx:115` is worse: success and failure share one `<p>` in
`text-ink-700` with `aria-live="polite"`. A failed pass application looks
exactly like a successful one.

### Five colour classes in use are not defined, so they render nothing

`src/styles.css` `@theme` defines `--color-danger-500` and stops.

| class | site | effect |
|---|---|---|
| `text-danger-700` | `error-panel.tsx:8` | **the error panel's own text colour does not exist** — it inherits `ink-800` |
| `hover:text-danger-600` | `profile-panel.tsx:57` | hover does nothing |
| `bg-success-400`, `shadow-success-400/20` | `payment.return.tsx:194` | invisible tick badge background |
| `text-success-300` | `payment.return.tsx:198` | inherits |
| `text-ink-950` | `payment.return.tsx:194` | inherits |

The component built in task 17 specifically to show errors is rendering them
in body colour.

### The biggest form in the app tells the user nothing

`src/routes/book.$tripId.tsx` is 1293 lines and imports **none** of
`Field`, `Input`, `Button`.

- `TextField` (`:1236`) is a private re-implementation of `Field` + `Input`.
  Its `required` prop renders an asterisk (`:1255`) and **never reaches the
  `<input>`** (`:1257`) — no `required`, no `aria-required`, no validation.
- `canProceed` (`:393-397`) is four ANDed conditions: seat count, email
  format, mobile format, complete passenger rows. It gates
  `disabled={!canProceed}` at `:829`.
- **Nothing anywhere renders which of the four failed.** A user with a
  9-digit mobile sees a dead grey button and no text. `disabled` also removes
  the button from the accessibility tree, so a screen reader gets silence.

`:811` hand-rolls the primary button class string a sixth time — the others
are `index.tsx:377`, `search.tsx:450`, `payment.return.tsx:262`,
`action-form.tsx:183`, `page-shell.tsx:52`.

### Nothing is extensible

- `src/lib/cn.ts:6` joins strings. **There is no `tailwind-merge`**, so
  `<Button className="rounded-full">` emits both `rounded-xl` and
  `rounded-full` and CSS source order decides — overriding a primitive is
  unreliable by construction. The file's own comment (`:2-3`) already names
  the fix.
- No `asChild`, so the six `<Link>`/`<a>` primary buttons above cannot use
  `Button` and copy its classes instead.
- 34 raw `<button>` elements outside `ui/button.tsx` against 20 `<Button>`.
- `rounded-2xl border border-ink-100` appears 27 times and
  `rounded-3xl border border-ink-100 bg-surface` 7 times — a `Card` nobody
  wrote. Eight `rounded-full … text-xs` pills — a `Badge`.
- `Field` is used in 3 files (8 call sites) out of every form in the app.

### What "shadcn" is missing

No `components.json`, no `tailwind-merge`, no `class-variance-authority`, no
`@radix-ui/*`. `clsx` is present only transitively. Tailwind v4 is in place
(`@import "tailwindcss"` + `@theme`), which is the shadcn-compatible setup —
but the theme exposes **palette** names (`ink`, `saffron`, `canvas`) and no
**semantic** names (`border`, `input`, `ring`, `destructive`,
`muted-foreground`). Registry components reference the semantic set, so
today a `bunx shadcn add` lands unstyled.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Theme strategy | Keep the palette, add a semantic alias layer on top | Registry components drop in unstyled otherwise. Aliasing means the GSRTC look is unchanged and there is still exactly one place a colour is defined. |
| `--color-primary` | `saffron-500`, **not** the gradient | `bg-primary` must be a flat colour for rings and borders to work. The gradient stays a project variant (`gradient-surface`) inside the button's cva map. |
| Invalid styling | Driven by the native `aria-invalid` attribute, not a prop | The attribute has to be there for accessibility regardless. `aria-invalid:border-destructive` means correctness and appearance cannot drift apart. |
| Select | Keep native `<select>`, styled | Radix Select is ~15 KB and replaces the native mobile picker, which is better than anything we would ship. Adopt only if a design needs custom option rendering. |
| Dialog | Keep native `<dialog>` (`action-form.tsx:159`) | Focus trap, Esc, backdrop and inertness for free. `@radix-ui/react-dialog` buys nothing here. |
| Icons | Keep `src/components/icons.tsx` | shadcn source imports `lucide-react`; swap those for local icons on paste. A whole icon package for one spinner is not worth it. |
| New deps | `tailwind-merge`, `clsx`, `class-variance-authority`, `@radix-ui/react-slot` | The four that make override, variants and `asChild` work. Nothing else. |
| Component set | The ten we actually render | `bunx shadcn add` on demand later. Do not import a registry catalogue. |
| Dark mode | Not now | The token layer makes it a later `.dark { }` block; there is no dark design to implement. |

---

# Part A — The token layer

Add to `src/styles.css` inside `@theme`, below the palette. Aliases only —
no new colour values except the five that are missing.

```css
  /* Missing palette entries (currently used and rendering nothing) */
  --color-ink-950: #0f0d0a;
  --color-danger-50:  #fdf0ea;
  --color-danger-600: #bf4310;
  --color-danger-700: #99360d;
  --color-success-300: #a9d6a8;
  --color-success-400: #6bb26c;

  /* Semantic layer — what shadcn components reference */
  --color-background: var(--color-canvas);
  --color-foreground: var(--color-ink-800);
  --color-card: var(--color-surface);
  --color-card-foreground: var(--color-ink-900);
  --color-popover: var(--color-surface);
  --color-popover-foreground: var(--color-ink-900);
  --color-primary: var(--color-saffron-500);
  --color-primary-foreground: #ffffff;
  --color-secondary: var(--color-surface);
  --color-secondary-foreground: var(--color-ink-700);
  --color-muted: var(--color-canvas-2);
  --color-muted-foreground: var(--color-ink-500);
  --color-accent: var(--color-saffron-50);
  --color-accent-foreground: var(--color-saffron-700);
  --color-destructive: var(--color-danger-500);
  --color-destructive-foreground: #ffffff;
  --color-success: var(--color-success-500);
  --color-success-foreground: var(--color-success-700);
  --color-border: var(--color-ink-100);   /* card & divider borders */
  --color-input: var(--color-ink-200);    /* control borders */
  --color-ring: var(--color-saffron-300);
  --radius: 0.75rem;                       /* rounded-xl, the house radius */
```

The `border`/`input` split is not a shadcn quirk we are working around — it
is exactly the split this codebase already uses by hand (`ink-100` on cards,
`ink-200` on controls). It falls out clean.

`--color-success*` is an addition to the registry set. The notice component
in Part B needs it, and three call sites already use `text-success-700`.

Existing palette classes keep working; nothing in `src/` has to change in
this step. Migration of call sites to semantic names is opportunistic, not
required — do it in files you are already touching.

# Part B — The primitives

## B0 · `cn` and `components.json`

`src/lib/cn.ts` becomes the two-line shadcn version its own comment
describes:

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Signature is unchanged, so no call site moves. This is the change that makes
`className` overrides actually win.

`components.json` at the repo root:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles.css", "baseColor": "neutral",
                "cssVariables": true },
  "aliases": { "components": "@/components", "ui": "@/components/ui",
               "lib": "@/lib", "utils": "@/lib/cn", "hooks": "@/hooks" }
}
```

**The CLI writes `@/…` imports; this repo uses `#/…`** (`package.json`
`imports`). `@/*` exists in `tsconfig.json` paths but is not in the Node
`imports` map, so it resolves in Vite and not in vitest or Bun scripts.
After every `shadcn add`, rewrite `@/` to `#/` in the added file. Note it in
the file header so the next person does not discover it via a test failure.

## B1 · `button.tsx`

cva map, `asChild`, `loading`. Variants keep today's four looks and add the
two the codebase hand-rolls:

| variant | class |
|---|---|
| `primary` (default) | `gradient-surface text-primary-foreground shadow-sm hover:brightness-105` |
| `secondary` | `border border-input bg-card text-secondary-foreground hover:bg-background` |
| `ghost` | `text-foreground hover:bg-accent hover:text-accent-foreground` |
| `destructive` | `bg-destructive text-destructive-foreground hover:brightness-105` |
| `link` | `text-brand-700 underline-offset-4 hover:underline` |

Sizes `sm` / `md` / `lg` unchanged, plus `icon` for the 2 icon-only buttons
in `site-header.tsx`.

```tsx
loading?: boolean;   // renders <SpinnerIcon/>, sets aria-busy, disables
asChild?: boolean;   // <Button asChild><Link to="/search">…</Link></Button>
```

`loading` replaces six hand-written `{submitting ? "Sending OTP…" : "Send
OTP"}` ternaries — the label stops changing, the spinner carries the state,
and translation drops from two strings to one.

`SpinnerIcon` goes in `src/components/icons.tsx` beside the others, honouring
`motion-reduce`.

## B2 · `control.ts`, `input.tsx`, `textarea.tsx`, `select.tsx`

Append to `CONTROL_CLASS`:

```
aria-invalid:border-destructive aria-invalid:ring-destructive/30
aria-invalid:focus-visible:border-destructive
```

No prop, no new export. A control is styled wrong exactly when it is marked
wrong. Add `disabled:cursor-not-allowed disabled:opacity-60` while here —
none of the three has a disabled style today.

## B3 · `field.tsx` — the component this task exists for

```tsx
interface FieldProps {
  children: (props: { id: string; "aria-invalid"?: true;
                      "aria-describedby"?: string }) => React.ReactNode;
  className?: string;
  description?: string;
  error?: string;      // already-translated message, or a copy key for t()
  label: string;
  required?: boolean;
}
```

The render prop widens from `(id)` to a props object so a control cannot be
wired half-correctly. The eight existing call sites become
`{(props) => <Input {...props} … />}`.

Rules the implementation must hold:

- `error` present ⇒ control gets `aria-invalid="true"` and
  `aria-describedby` pointing at the message; absent ⇒ `aria-describedby`
  points at `description` if there is one, else nothing.
- The message renders in `text-destructive text-sm` with `role="alert"`, and
  **replaces** the description rather than stacking with it.
- `required` sets `aria-required` on the control *and* renders the asterisk,
  with `<span className="sr-only"> (required)</span>` — the asterisk alone is
  not an accessible name. This is the `TextField:1255` bug fixed in the
  shared place instead of the one call site that has it.
- Ids come from `useId()` as today, suffixed `-desc` / `-error`.

## B4 · `alert.tsx` and `notice`

One component, three tones — `destructive`, `success`, `info` — replacing
the seven duplicated `<p>` blocks and the ad-hoc panels at `track.tsx:107`
and `wallet-panel.tsx:162`.

`ErrorPanel` (`error-panel.tsx`) keeps its name and signature and becomes a
thin wrapper: `<Alert tone="destructive">` with title / detail / action /
trace id. Its `text-danger-700` starts working once Part A defines it.

## B5 · `card.tsx`, `badge.tsx`, `label.tsx`

Mechanical. `Card` (+`CardHeader`/`CardTitle`/`CardContent`) covers the 34
hand-rolled surface panels; `Badge` covers the 8 pills; `Label` is the
`<label>` `Field` already renders, extracted so other components can use it.

Convert call sites opportunistically. **This part is droppable** if the task
is running long — it is deduplication, not a fix. Parts A–B4 and C are not.

# Part C — Make the failures visible

This is the deliverable. Parts A and B are what make it uniform.

## C1 · The booking form says what is wrong

`src/routes/book.$tripId.tsx`:

1. Delete `TextField` (`:1236-1264`); use `Field` + `Input`.
2. Extract the `canProceed` conditions (`:393-397`) into
   `src/lib/booking-validation.ts`:

   ```ts
   type FieldErrors = { email?: string; mobile?: string; seats?: string;
                        passengers?: Record<string, string> };
   validateBookingDetails(input): FieldErrors   // pure, no React
   ```

   `canProceed` becomes `Object.keys(errors).length === 0` — same gate, now
   with the reasons attached.
3. Errors show **on blur or after the first submit attempt**, never on first
   keystroke into an empty field.
4. The continue button (`:826-836`) keeps `disabled` only while submitting.
   For invalid input it stays enabled, and pressing it renders the errors and
   moves focus to the first invalid control. A button that cannot be pressed
   and cannot explain itself is the bug being fixed; do not reintroduce it in
   a nicer colour.
5. Message keys go through `t()` and into `MESSAGES` for `gu`/`hi`.

## C2 · Stop flattening `AppError`

The five sites in "Current state" hold `AppError | null` in state instead of
`string`, and render `<ErrorPanel>`. Delete `formatError` from
`wallet-panel.tsx:29` and `profile-panel.tsx:20`, and the `.detail`-only
truncation at the eight `login.tsx` sites.

This is a net deletion and it restores translation and the `action` sentence
at every one of them for free.

## C3 · `action-form.tsx` separates success from failure

Split `feedback` into `error: AppError | null` and `notice: string | null`
(`:23`, `:115`). Failure renders `<ErrorPanel>` with `role="alert"`; success
renders `<Alert tone="success">` with `aria-live="polite"`. The client-side
"Choose a pass type" check (`:40`) becomes a `Field` error on the select,
not a page-level message.

## C4 · Server errors reach the field that caused them

Where a task-17 reason maps to one input, route it there rather than to the
page. Minimum set:

| reason | field |
|---|---|
| `mobile_mismatch` | mobile |
| `pnr_unknown`, `booking_unknown` | reference input |
| `vehicle_unknown` | vehicle number (`track.tsx`) |
| `otp_throttled` | OTP input |

Everything else stays a page-level `ErrorPanel`. One mapping table in
`src/lib/error-copy.ts` — do not scatter `if (reason === …)` across routes.

---

## Steps

1. Part A: add the five missing palette entries and the semantic layer to
   `src/styles.css`. Confirm `error-panel.tsx` visibly turns red.
2. `bun add tailwind-merge clsx class-variance-authority @radix-ui/react-slot`;
   rewrite `src/lib/cn.ts`; add `components.json`.
3. Rewrite `button.tsx` (cva, `asChild`, `loading`); add `SpinnerIcon`.
4. Add the `aria-invalid` and `disabled` styles to `control.ts`.
5. Rewrite `field.tsx` with `error` / `required` and the props-object render
   prop; update the 8 existing call sites.
6. Add `alert.tsx`; reduce `error-panel.tsx` to a wrapper; replace the seven
   duplicated `<p>` blocks.
7. Write `src/lib/booking-validation.ts` **and its test, before wiring it**.
8. C1: delete `TextField`, wire `Field` + errors + focus-first-invalid.
9. C2 and C3: hold `AppError`, delete both `formatError` copies.
10. C4: add the reason→field map; wire the four routes.
11. Add every new message to `MESSAGES` for `gu` and `hi`.
12. Part B5 (`card`, `badge`, `label`) and call-site conversion, if time.
13. Replace the six hand-rolled primary-button class strings with
    `<Button asChild>`.
14. `bun x ultracite check` and `bun run test`.

## Required tests

`src/lib/booking-validation.test.ts` — pure, node environment, no new deps.

- [ ] A 9-digit mobile produces a `mobile` error and no others.
- [ ] A malformed email produces an `email` error and no others.
- [ ] A passenger row missing an age produces an error keyed by that seat no.
- [ ] Selecting fewer seats than `passengers` produces a `seats` error.
- [ ] Fully valid input produces `{}` — the gate is the empty object, so
      `canProceed` and the messages can never disagree.
- [ ] Every message returned is a key present in `MESSAGES.gu` and
      `MESSAGES.hi`. This is the test that stops the copy rotting.

`src/lib/error-copy.test.ts` — extend the existing file.

- [ ] Every reason in the C4 map names a field, and every reason not in it
      falls through to page level.

Optional, and the only new devDeps (`jsdom`, `@testing-library/react`), via a
`// @vitest-environment jsdom` docblock so `vitest.config.ts` needs no change:

- [ ] `Field` with an `error` renders the message, sets `aria-invalid` on
      the control, and points `aria-describedby` at the message id.
- [ ] `Field` without an `error` sets neither.

## Acceptance criteria

- [ ] No class in `src/` references a colour token `src/styles.css` does not
      define — verified by the diff in "Current state" being empty.
- [ ] `<Button className="rounded-full">` renders `rounded-full` and not
      `rounded-xl`.
- [ ] Submitting the booking details step with an invalid mobile shows a
      message on the mobile field and moves focus to it.
- [ ] No control anywhere is disabled as the only signal that input is wrong.
- [ ] Every field error sets `aria-invalid` and is reachable via
      `aria-describedby`.
- [ ] No call site converts an `AppError` to a string; `formatError` does not
      exist in the codebase.
- [ ] `login.tsx` shows the `action` sentence, not just `detail`.
- [ ] A failed pass application in `action-form.tsx` is visually and
      semantically distinct from a successful one.
- [ ] Every new user-facing string renders in Gujarati and Hindi.
- [ ] `bunx shadcn@latest add <anything>` produces a component that renders
      correctly styled after the `@/`→`#/` rewrite, with no other edit.
- [ ] The primary button class string appears exactly once in the codebase.
- [ ] `bun x ultracite check` passes with no new biome override.
- [ ] `bun run test` passes.
- [ ] The board row in `README.md` is updated in the same commit.

## Out of scope

- Dark mode. The token layer makes it a later `.dark { }` block; there is no
  dark design to build against.
- A form library. Every form here is uncontrolled `FormData` or a handful of
  `useState`. React Hook Form and TanStack Form both cost more than the
  validation function in Part C1.
- Radix Select, Dialog, Popover, Tooltip. Native equivalents already do the
  job; adopt individually when a design needs what they add.
- `lucide-react`. `icons.tsx` covers the app; one spinner is not a package.
- Storybook or a component gallery route. Six primitives used across nine
  routes do not need a catalogue.
- Redesigning anything. Every variant reproduces a look that exists today;
  this task changes structure and error behaviour, not the design.
- Rewriting all 34 raw `<button>` elements. Convert the ones in files Part C
  already touches; the rest is Part B5's opportunistic clean-up.
- Client-side validation of anything the server also validates. The field
  errors here are format and completeness checks that avoid a round trip —
  the server stays the authority (`00-conventions.md`).
