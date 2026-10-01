# Boodskippies architecture

## Page layout

The app is a single-page interface built from sections inside `index.html`.

The main page sections are:

- `#shopping-list` — choose recipes and generate a grocery list
- `#shopping-list-result` — show grouped ingredients by aisle
- `#recipe-list` — manage recipe cards by category
- `#recipe-details` — edit or create a recipe
- `#ingredient-info` — manage supermarket aisles and optional Jumbo product URLs for ingredients

Page switching happens through `switchPage(page, payload)` in `js/core.js`.

## Rendering flow

### Recipe management

`recipe-list.js`:

- reads `allRecipes`
- groups by `category`
- renders cards for each recipe
- sends the user to the detail form with `switchPage('recipeDetails', recipe)`
- copies the current recipe list to the clipboard on save

`recipe-details.js`:

- populates fields from the selected recipe or a blank object
- allows adding/removing ingredient rows and optional ingredient rows
- writes changed recipe data back into `allRecipes`
- returns to the recipes page after save

### Shopping list generation

`shopping-list.js`:

- finds all checked recipe cards
- combines matching ingredients by name and type
- keeps a list of recipe names that contributed to each ingredient
- adds optional ingredients as separate items when present
- passes the aggregated list to `switchPage('shoppingListResult', saved)`

`shopping-list-result.js`:

- groups generated items by aisle
- sorts by the order defined in `ingredientInfo.aisles`
- renders aisle subheadings and touch-friendly item checkboxes; checked items are struck through
- keeps optional items muted and recipe metadata in item tooltips
- links items only when `jumboSku` contains a full HTTP(S) Jumbo product URL, using a yellow Lucide truck icon to open that exact URL in a new tab; short SKUs and invalid URLs have no link
- checkbox state lasts for the rendered list and resets when a new result is generated

### Ingredient info management

`ingredient-info.js`:

- extracts all ingredient names from recipes
- displays them in a table with an aisle dropdown and an optional Jumbo URL text field
- preserves full dropped product URLs, validated by the shared `getJumboProductUrl` helper in `core.js`
- saves the updated `ingredientInfo` object to the clipboard, omitting blank `jumboSku` properties

## Data sources

The app intentionally does not use a backend. Static data is loaded via script tags in `index.html`:

```html
<script src="data/recipes.js"></script>
<script src="data/ingredient-info.js"></script>
<script src="js/core.js"></script>
```

This means changing the data files updates the app immediately in the browser.

## Naming and conventions

- Global app state is stored in top-level variables like `allRecipes` and `ingredientInfo`.
- The code uses a mix of ES5-style functions and jQuery patterns.
- `renderX` functions are assigned to global variables and called by `switchPage`.
- `$(function () { ... })` is used to bind events after the DOM is ready.

## Risks and caveats

- The app assumes a single browser session; there is no persisted storage.
- The generated clipboard output is intentionally designed to be pasted into a JS file.
- Data integrity depends on ingredient names being consistent across recipes and aisle assignments.
- There is no validation layer for duplicates, empty names, or malformed quantities.

## Good editing rules

- Keep ingredient names consistent across recipes to ensure merged shopping list behavior works correctly.
- Match aisle names to the values in `data/ingredient-info.js` exactly.
- Be careful when rearranging script load order because the app expects globals and DOM elements to exist before the logic runs.
- If adding a new page, also register it in `switchPage(...)` and ensure a matching element exists in `index.html`.
