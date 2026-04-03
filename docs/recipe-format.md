# Recipe Format Guide

This guide walks you through creating a recipe JSON file for Rise. By the end, you will have a working recipe that the scheduler can plan around your life.

---

## Quick Start -- Convert Your Recipe in 10 Minutes

Here is the checklist. Each step is explained in detail below.

1. **Create a folder** under `recipes/` with a slug name (lowercase, hyphens instead of spaces). Example: `recipes/my-sourdough/`
2. **Create `recipe.json`** inside that folder.
3. **Fill in metadata** -- give your recipe an `id` (must match the folder name), a `name`, a `description`, and a `baseYield`.
4. **Define ingredient groups** -- list every ingredient, grouped by the phase where it is used.
5. **Define phases and steps** -- this is the core of the recipe. Break your process into phases, and each phase into steps. This is the most involved part; take your time.
6. **Set up dependencies** -- tell Rise which step must finish before the next one can start.
7. **Optionally add extras** -- surplus storage options, notes, and images.

### 1. Create the folder

```
recipes/
  my-sourdough/
    recipe.json
    hero.jpg          (optional)
    001-scoring.jpg   (optional)
```

The folder name is your recipe's slug. Use only lowercase letters, numbers, and hyphens.

### 2. Create `recipe.json`

Start with this skeleton:

```json
{
  "id": "my-sourdough",
  "name": "My Sourdough Bread",
  "description": "A simple overnight sourdough loaf.",
  "baseYield": {
    "amount": 2,
    "unit": "loaves",
    "weightPerUnit": { "min": 800, "max": 850 }
  },
  "ingredientGroups": [],
  "phases": []
}
```

### 3. Fill in metadata

- `id` must exactly match the folder name.
- `name` is what users see in the app.
- `description` is a short summary (one or two sentences).
- `source` (optional) -- a URL or book title where the recipe came from.
- `favorite` (optional) -- set to `true` to pin it.
- `baseYield` describes what the recipe produces. `weightPerUnit` is in grams.

### 4. Define ingredient groups

Each group belongs to a phase and lists its ingredients:

```json
"ingredientGroups": [
  {
    "name": "Levain",
    "phase": "levain-build",
    "items": [
      { "name": "Bread flour", "amount": 100, "unit": "g", "scalable": true },
      { "name": "Water", "amount": 100, "unit": "ml", "scalable": true },
      { "name": "Starter", "amount": 20, "unit": "g", "scalable": true }
    ]
  }
]
```

- `scalable: true` means the amount adjusts when the user changes the yield.
- `scalable: false` is for things that stay fixed regardless of batch size (e.g. "1 pinch of saffron").
- `optional: true` marks an ingredient the user can opt in or out of.
- `notes` is a free-text string for tips ("room temperature", "sifted", etc.).

### 5. Define phases and steps

A **phase** is a logical stage of your recipe (e.g. "Levain Build", "Main Dough", "Bake"). Each phase contains one or more **steps**.

A **step** is a single action or waiting period:

```json
{
  "id": "mix-levain",
  "name": "Mix levain",
  "emoji": "🫙",
  "type": "active",
  "duration": { "min": 5, "ideal": 10, "max": 15 },
  "dependsOn": null,
  "description": "Combine {{ingredient:Bread flour}}, {{ingredient:Water}}, and {{ingredient:Starter}}. Mix until no dry flour remains.",
  "alarm": { "enabled": true, "offsetMinutes": 0 },
  "flexPriority": 1,
  "unsocialHours": { "canOverlap": false, "mustAvoid": true }
}
```

Key concepts:

- **`type`**: `"active"` means you need to be in the kitchen doing something. `"passive"` means the dough is resting or fermenting and you can walk away.
- **`duration`**: Always three values. `ideal` is what the scheduler targets. `min` and `max` are the hard boundaries -- the scheduler will never go outside them.
- **`flexPriority`**: A number from 1 to 10. `1` = rigid, do not move this step. `10` = very flexible, adjust this first. The scheduler stretches or compresses high-priority (high number) steps first when fitting the recipe to your schedule.
- **`unsocialHours`**: Controls what happens during sleeping hours (typically 11pm--7am).
  - `canOverlap: true` -- this step can run overnight. Use for passive steps like cold fermentation.
  - `mustAvoid: true` -- this step should not be scheduled during unsocial hours. Use for active steps where you need to be awake.
- **`alarm`**: Whether to send a notification. `offsetMinutes: 0` means "alert when the step starts". A negative value (e.g. `-5`) means "alert 5 minutes before".
- **`emoji`** (optional): Shown in the timeline and calendar events.

### 6. Set up dependencies

Every step has a `dependsOn` field. Set it to the `id` of the step that must complete before this one starts. The very first step in your recipe has `dependsOn: null`.

```json
{ "id": "autolyse", "dependsOn": "mix-levain", ... },
{ "id": "bulk-ferment", "dependsOn": "autolyse", ... }
```

This creates the chain: mix-levain -> autolyse -> bulk-ferment.

You can also add a **gap** between steps using `gapAfterPrevious`. This means "after the dependency finishes, wait this long before starting me." See the Common Patterns section for an example.

### 7. Optionally add extras

- **`surplus`** -- define what to do with leftover dough (fridge, freeze, par-bake). See the Surplus Handling section.
- **`notes`** -- general tips that appear on the recipe page.
- **Images** -- drop image files into the recipe folder. See the Images section.

---

## Schema Reference

### Top-level fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | Yes | -- | Unique identifier. Must match the folder name. |
| `name` | string | Yes | -- | Display name shown in the app. |
| `description` | string | Yes | -- | Short summary of the recipe. |
| `source` | string | No | -- | URL or book reference for the original recipe. |
| `favorite` | boolean | No | `false` | Pin this recipe to the top of the list. |
| `baseYield` | object | Yes | -- | What the recipe produces. See below. |
| `ingredientGroups` | array | Yes | -- | At least one group. See below. |
| `phases` | array | Yes | -- | At least one phase. See below. |
| `surplus` | object | No | -- | Options for storing leftover dough. |
| `notes` | array | No | -- | General recipe notes. |

### baseYield

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | Yes | Number of units produced (e.g. 6 dough balls). |
| `unit` | string | Yes | Name of the unit (e.g. "loaves", "rolls", "dough balls"). |
| `weightPerUnit.min` | number | Yes | Minimum weight per unit in grams. |
| `weightPerUnit.max` | number | Yes | Maximum weight per unit in grams. |

### ingredientGroups

Each group is an object:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Group label (e.g. "Poolish", "Main Dough"). |
| `phase` | string | Yes | The `id` of the phase this group belongs to. |
| `items` | array | Yes | At least one ingredient item. |

Each **item** in `items`:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | Yes | -- | Ingredient name. Also used in `{{ingredient:NAME}}` placeholders. |
| `amount` | number | Yes | -- | Quantity for the base yield. |
| `unit` | string | Yes | -- | Unit of measure (g, ml, tsp, etc.). |
| `scalable` | boolean | Yes | -- | Whether this scales with yield changes. |
| `notes` | string | No | -- | Tips or clarifications. |
| `optional` | boolean | No | `false` | When `true`, the ingredient is excluded by default; the user can opt in. |

### phases

Each phase is an object:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique phase identifier. Referenced by `ingredientGroups[].phase`. |
| `name` | string | Yes | Display name. |
| `steps` | array | Yes | At least one step. |

### steps (phaseStep)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | Yes | -- | Unique step identifier. Used in `dependsOn` references. |
| `name` | string | Yes | -- | Short name shown in timeline. |
| `emoji` | string | No | -- | Emoji shown in timeline and calendar events. |
| `type` | `"active"` or `"passive"` | Yes | -- | `"active"` = you must be present. `"passive"` = waiting/resting. |
| `duration.min` | number | Yes | -- | Minimum duration in minutes. |
| `duration.ideal` | number | Yes | -- | Target duration the scheduler aims for. |
| `duration.max` | number | Yes | -- | Maximum duration in minutes. |
| `dependsOn` | string or null | Yes | -- | ID of the step that must complete first, or `null` for the first step. |
| `gapAfterPrevious` | duration object | No | -- | Optional delay between the dependency finishing and this step starting. Same `min`/`ideal`/`max` structure. |
| `description` | string | Yes | -- | Instructions shown to the user. Supports template placeholders. |
| `alarm.enabled` | boolean | Yes | -- | Whether to send a notification. |
| `alarm.offsetMinutes` | number | Yes | -- | Minutes before (negative) or after (positive) step start to fire the alarm. |
| `flexPriority` | number (1--10) | Yes | -- | `1` = rigid. `10` = very flexible. The scheduler adjusts high-number steps first. |
| `unsocialHours.canOverlap` | boolean | Yes | -- | `true` for passive steps that can run overnight. |
| `unsocialHours.mustAvoid` | boolean | Yes | -- | `true` for active steps that should not happen at 4am. |
| `optional` | boolean | No | `false` | When `true`, the step is excluded by default; the user can opt in. |

### surplus

| Field | Type | Required | Description |
|---|---|---|---|
| `enabled` | boolean | Yes | Whether surplus options are offered to the user. |
| `options` | array | Yes | List of surplus option objects. |

Each **surplus option**:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier (e.g. `"fridge"`, `"freeze"`). |
| `name` | string | Yes | Display name. |
| `description` | string | Yes | Instructions for storing the surplus. |
| `shelfLife.days` | number | Yes | How many days the stored dough keeps. |
| `shelfLife.qualityNotes` | string | Yes | How quality changes over time. |
| `reactivationSteps` | array | Yes | Steps to bring stored dough back to baking-ready. Uses the simpler reactivation step format (no `flexPriority` or `unsocialHours`). |

### notes

Each note is an object:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Heading for the note. |
| `content` | string | Yes | Body text. Use `\n` for line breaks. |

---

## Annotated Example

Below is a simplified version of the biga-pizza recipe with comments explaining each section. (JSON does not support comments, but this uses JSONC format for readability. Your actual file must be valid JSON without comments.)

```jsonc
{
  // Must match the folder name: recipes/biga-pizza/
  "id": "biga-pizza",
  "name": "100% Biga Pizza Dough",
  "description": "Slow-fermented pizza dough with 100% biga preferment and a long cold proof.",

  // Where you found the recipe (optional)
  "source": "https://youtube.com",

  // Pin to favorites (optional, default false)
  "favorite": true,

  // What the recipe produces at base scale
  "baseYield": {
    "amount": 6,               // 6 dough balls
    "unit": "dough balls",
    "weightPerUnit": {
      "min": 250,              // grams each
      "max": 260
    }
  },

  // ---------- INGREDIENTS ----------
  // Grouped by the phase where they are used
  "ingredientGroups": [
    {
      "name": "Biga",
      "phase": "biga-prep",    // references the phase id below
      "items": [
        // scalable: true means this adjusts when the user changes yield
        { "name": "Bread flour", "amount": 1000, "unit": "g", "scalable": true,
          "notes": "12-13% protein" },
        { "name": "Water", "amount": 450, "unit": "ml", "scalable": true },
        { "name": "Dry yeast", "amount": 2, "unit": "g", "scalable": true }
      ]
    },
    {
      "name": "Main dough",
      "phase": "main-dough",
      "items": [
        { "name": "Water", "amount": 200, "unit": "ml", "scalable": true },
        { "name": "Salt", "amount": 20, "unit": "g", "scalable": true },
        { "name": "Dry yeast", "amount": 1.5, "unit": "g", "scalable": true }
      ]
    }
  ],

  // ---------- PHASES ----------
  "phases": [
    {
      "id": "biga-prep",
      "name": "Biga Preparation",
      "steps": [
        {
          "id": "biga-mix",
          "name": "Mix biga",
          "emoji": "🍕",
          "type": "active",          // You are doing something
          "duration": {
            "min": 15,               // At least 15 minutes
            "ideal": 20,             // Scheduler targets 20
            "max": 25                // Never more than 25
          },
          "dependsOn": null,         // First step -- no dependency
          "alarm": { "enabled": true, "offsetMinutes": 0 },
          // Template placeholders get replaced with scaled amounts:
          "description": "Combine {{ingredient:Bread flour}} flour and {{ingredient:Dry yeast}} yeast.\nAdd {{ingredient:Water}} water, close lid, shake until strands form.",
          "flexPriority": 1,         // Rigid -- don't move this
          "unsocialHours": {
            "canOverlap": false,     // Should not run overnight
            "mustAvoid": true        // Don't schedule at 4am
          }
        },
        {
          "id": "biga-bulk",
          "name": "Room temp rest",
          "type": "passive",         // Dough is just sitting there
          "duration": { "min": 90, "ideal": 120, "max": 150 },
          "dependsOn": "biga-mix",   // Starts after biga-mix finishes
          "alarm": { "enabled": false, "offsetMinutes": 0 },
          "description": "Cover and leave at room temperature.",
          "flexPriority": 7,         // Quite flexible
          "unsocialHours": {
            "canOverlap": true,      // Fine to run overnight
            "mustAvoid": false
          }
        },
        {
          "id": "cold-ferment",
          "name": "Cold fermentation",
          "type": "passive",
          // 2280 min = 38h, 2760 min = 46h, 3000 min = 50h
          "duration": { "min": 2280, "ideal": 2760, "max": 3000 },
          "dependsOn": "biga-bulk",
          "alarm": { "enabled": false, "offsetMinutes": 0 },
          "description": "Cold proof in the fridge. 44-48h ideal.",
          "flexPriority": 10,        // Maximum flexibility
          "unsocialHours": { "canOverlap": true, "mustAvoid": false }
        }
      ]
    },
    {
      "id": "main-dough",
      "name": "Main Dough",
      "steps": [
        {
          "id": "knead",
          "name": "Knead main dough",
          "type": "active",
          "duration": { "min": 30, "ideal": 40, "max": 45 },
          "dependsOn": "cold-ferment",
          "alarm": { "enabled": true, "offsetMinutes": 0 },
          "description": "Break biga into pieces. Add yeast water, then salt water gradually. Knead 8-10 min.",
          "flexPriority": 1,
          "unsocialHours": { "canOverlap": false, "mustAvoid": true }
        },
        {
          "id": "shape",
          "name": "Shape dough balls",
          "type": "active",
          "duration": { "min": 20, "ideal": 30, "max": 40 },
          "dependsOn": "knead",
          "alarm": { "enabled": true, "offsetMinutes": 0 },
          // yield placeholders get replaced with the user's chosen amount:
          "description": "Shape {{yield:amount}} dough balls at {{yield:weightPerUnit}} g each.",
          "flexPriority": 2,
          "unsocialHours": { "canOverlap": false, "mustAvoid": true }
        },
        {
          // PARALLEL STEP: both final-proof and preheat depend on "shape"
          "id": "final-proof",
          "name": "Final proof",
          "type": "passive",
          "duration": { "min": 90, "ideal": 120, "max": 150 },
          "dependsOn": "shape",
          "alarm": { "enabled": false, "offsetMinutes": 0 },
          "description": "Proof dough balls at room temperature.",
          "flexPriority": 6,
          "unsocialHours": { "canOverlap": false, "mustAvoid": false }
        },
        {
          // PARALLEL STEP with a gap: also depends on "shape"
          "id": "preheat",
          "name": "Preheat oven",
          "type": "active",
          "duration": { "min": 30, "ideal": 45, "max": 60 },
          "dependsOn": "shape",
          // Gap: wait 45-110 min after shaping before preheating
          "gapAfterPrevious": { "min": 45, "ideal": 75, "max": 110 },
          "alarm": { "enabled": true, "offsetMinutes": 0 },
          "description": "Preheat oven now! At least 30-45 minutes.",
          "flexPriority": 3,
          "unsocialHours": { "canOverlap": false, "mustAvoid": true }
        },
        {
          "id": "bake",
          "name": "Bake",
          "type": "active",
          "duration": { "min": 20, "ideal": 30, "max": 45 },
          "dependsOn": "final-proof",  // Waits for proof, not preheat
          "alarm": { "enabled": true, "offsetMinutes": 0 },
          "description": "Stretch, top, and bake.",
          "flexPriority": 1,
          "unsocialHours": { "canOverlap": false, "mustAvoid": true }
        }
      ]
    }
  ],

  // ---------- SURPLUS OPTIONS (optional) ----------
  "surplus": {
    "enabled": true,
    "options": [
      {
        "id": "fridge",
        "name": "Refrigerate",
        "description": "Cover shaped dough balls and refrigerate.",
        "shelfLife": {
          "days": 2,
          "qualityNotes": "Day 1: nearly identical. Day 2: noticeable but still good."
        },
        "reactivationSteps": [
          {
            "id": "surplus-fridge-out",
            "name": "Bring to room temp",
            "type": "passive",
            "duration": { "min": 90, "ideal": 120, "max": 150 },
            "dependsOn": null,
            "description": "Take dough balls out of the fridge and let them come to room temperature.",
            "alarm": { "enabled": true, "offsetMinutes": 0 }
          },
          {
            "id": "surplus-fridge-bake",
            "name": "Bake",
            "type": "active",
            "duration": { "min": 15, "ideal": 20, "max": 30 },
            "dependsOn": "surplus-fridge-out",
            "description": "Stretch, top, and bake.",
            "alarm": { "enabled": true, "offsetMinutes": 0 }
          }
        ]
      }
    ]
  },

  // ---------- NOTES (optional) ----------
  "notes": [
    {
      "title": "Flour",
      "content": "Use a strong bread flour with 12-13% protein for best results."
    }
  ]
}
```

---

## Common Patterns

### Linear chain

The simplest pattern. Each step depends on the previous one:

```
mix -> bulk-ferment -> shape -> proof -> bake
```

```json
{ "id": "mix",          "dependsOn": null },
{ "id": "bulk-ferment", "dependsOn": "mix" },
{ "id": "shape",        "dependsOn": "bulk-ferment" },
{ "id": "proof",        "dependsOn": "shape" },
{ "id": "bake",         "dependsOn": "proof" }
```

### Parallel steps

When two steps depend on the same predecessor, they run at the same time. In the biga-pizza recipe, both `final-proof` and `preheat` depend on `shape`:

```
          ┌─ final-proof ─┐
shape ──┤                  ├── bake
          └─── preheat ───┘
```

```json
{ "id": "final-proof", "dependsOn": "shape" },
{ "id": "preheat",     "dependsOn": "shape" }
```

The scheduler starts both as soon as `shape` finishes.

### Long passive steps

For steps like a 2-day cold fermentation, use a large duration range and high `flexPriority`:

```json
{
  "id": "cold-ferment",
  "type": "passive",
  "duration": { "min": 2280, "ideal": 2760, "max": 3000 },
  "flexPriority": 10,
  "unsocialHours": { "canOverlap": true, "mustAvoid": false }
}
```

The scheduler has nearly a full day of slack (from 38h to 50h) to fit around your life.

### Gap between steps

Use `gapAfterPrevious` when a step should not start immediately after its dependency. For example, "start preheating the oven about 75 minutes after shaping":

```json
{
  "id": "preheat",
  "dependsOn": "shape",
  "gapAfterPrevious": { "min": 45, "ideal": 75, "max": 110 },
  "duration": { "min": 30, "ideal": 45, "max": 60 }
}
```

The scheduler will wait 45--110 minutes after `shape` finishes before scheduling `preheat`.

### Optional steps

Mark steps or ingredients that are not part of the core recipe but can be opted into:

```json
{
  "id": "steam-injection",
  "name": "Steam injection",
  "optional": true,
  "type": "active",
  "duration": { "min": 2, "ideal": 5, "max": 5 },
  "dependsOn": "preheat",
  ...
}
```

```json
{ "name": "Malt syrup", "amount": 5, "unit": "g", "scalable": true, "optional": true }
```

Optional items are excluded by default. The user can toggle them on in the app.

### Surplus handling

Surplus options tell the user what to do with extra dough and how to bake it later. Each option has its own `reactivationSteps` -- a mini-recipe for bringing stored dough back to life:

```json
"surplus": {
  "enabled": true,
  "options": [
    {
      "id": "freeze",
      "name": "Freeze",
      "description": "Oil each dough ball, place in freezer bags, press out air.",
      "shelfLife": {
        "days": 28,
        "qualityNotes": "Noticeable quality loss. Good enough for spontaneous pizza nights."
      },
      "reactivationSteps": [
        {
          "id": "thaw",
          "name": "Thaw overnight in fridge",
          "type": "passive",
          "duration": { "min": 600, "ideal": 720, "max": 900 },
          "dependsOn": null,
          "description": "Move from freezer to fridge the evening before.",
          "alarm": { "enabled": true, "offsetMinutes": 0 }
        },
        {
          "id": "temper",
          "name": "Bring to room temp",
          "type": "passive",
          "duration": { "min": 120, "ideal": 150, "max": 180 },
          "dependsOn": "thaw",
          "description": "Take out of the fridge and let warm up.",
          "alarm": { "enabled": true, "offsetMinutes": 0 }
        },
        {
          "id": "bake-frozen",
          "name": "Bake",
          "type": "active",
          "duration": { "min": 15, "ideal": 20, "max": 30 },
          "dependsOn": "temper",
          "description": "Stretch, top, and bake.",
          "alarm": { "enabled": true, "offsetMinutes": 0 }
        }
      ]
    }
  ]
}
```

Reactivation steps use a simpler format than phase steps -- they do not need `flexPriority` or `unsocialHours`.

---

## Template Placeholders

Step descriptions support placeholders that get replaced with actual values when displayed in the app and in calendar (ICS) events.

### Ingredient placeholders

```
{{ingredient:NAME}}
```

Replaced with the scaled amount and unit of the named ingredient. The `NAME` must exactly match an ingredient's `name` field.

**Example:** If the user scales the recipe to 12 dough balls (2x), the description:

```
Add {{ingredient:Water}} water and {{ingredient:Salt}} salt.
```

renders as:

```
Add 400 ml water and 40 g salt.
```

### Yield placeholders

```
{{yield:amount}}         -- the number of units (e.g. "6")
{{yield:weightPerUnit}}  -- the weight range per unit (e.g. "250-260")
```

**Example:**

```
Shape {{yield:amount}} dough balls at {{yield:weightPerUnit}} g each.
```

renders as:

```
Shape 6 dough balls at 250-260 g each.
```

These placeholders work in step descriptions, and they are also rendered in exported ICS calendar events so the instructions make sense outside the app.

---

## Validation

### Command line

Validate your recipe against the JSON Schema:

```bash
npx ajv-cli validate -s recipes/recipe.schema.json -d recipes/my-recipe/recipe.json
```

If there are errors, `ajv-cli` will tell you which field is wrong and why.

### VS Code autocomplete

Add this to your `.vscode/settings.json` to get autocomplete and inline validation while editing recipe files:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["recipes/*/recipe.json"],
      "url": "./recipes/recipe.schema.json"
    }
  ]
}
```

With this configured, VS Code will underline errors and suggest field names as you type.

---

## Images

All images are optional. Drop them into the recipe folder alongside `recipe.json`.

| File | Purpose |
|---|---|
| `hero.jpg` (or `.png`, `.webp`) | Main recipe image, shown prominently at the top. |
| Any other image file | Appears in the recipe's image gallery. |

To control gallery order, prefix filenames with numbers:

```
recipes/my-sourdough/
  hero.jpg
  001-mixing.jpg
  002-bulk-ferment.jpg
  003-crumb-shot.jpg
```

Images are sorted alphabetically, so the number prefix determines the display order.
