# Boodskippies docs

This folder is for project-specific context that helps future AI agents and human contributors understand the webpage quickly.

## Project summary

Boodskippies is a static browser app for:

- managing recipe categories, ingredients, and optional items
- choosing a set of recipes for a week or shopping trip
- combining those ingredients into a single supermarket shopping list
- grouping ingredients by aisle so the list is easier to shop in order

The app uses plain HTML, Bootstrap, jQuery, and static JavaScript files. There is no backend, database, or server-side state.

## How the app works

1. `index.html` defines the pages and navigation.
2. `data/recipes.js` contains the master recipe list as a global `allRecipes` array.
3. `data/ingredient-aisles.js` contains the aisle definitions as a global `aisleInfo` object.
4. The JS files under `js/` render each page, capture form edits, and navigate between screens.
5. The shopping list page merges matched ingredients from selected recipes into one grouped result.
6. Save actions copy generated JavaScript snippets to the clipboard, not to local storage or a server.

## Important behavior

- The app relies on global variables and jQuery DOM selectors.
- Navigation is handled through `switchPage(...)` in `js/core.js`.
- All pages are in one HTML file, but they are shown/hidden by CSS (`display: none`).
- The generated shopping list is ordered by aisle using `aisleInfo.aisles`.
- Optional ingredients are included in a muted, italicized result but are marked as non-required.

## Main files

- `index.html` — layout, templates, page sections, script includes
- `js/core.js` — page switching and shared setup
- `js/recipe-list.js` — browse and save recipes
- `js/recipe-details.js` — add/edit recipe form logic
- `js/shopping-list.js` — recipe selection and ingredient aggregation
- `js/shopping-list-result.js` — grouped grocery output by aisle
- `js/aisles.js` — ingredient-to-aisle assignment management
- `data/recipes.js` — recipe definitions
- `data/ingredient-aisles.js` — aisle metadata and ingredient mapping

## Data model

### Recipe

Each recipe is an object like:

```js
{
  name: 'Pasta bolognese',
  category: 'Pasta/rijst',
  ingredients: [
    { quantity: 1, ingredient: 'Pasta' },
    { quantity: 300, quantityType: 'gram', ingredient: 'Gehakt' }
  ],
  optionalIngredients: [
    { ingredient: 'Parmezaan' }
  ]
}
```

### Aisle config

```js
var aisleInfo = {
  aisles: ['Groente/fruit', 'Brood'],
  ingredients: [
    { name: 'Aardappels', aisle: 'Groente/fruit' },
    { name: 'Brood', aisle: 'Brood' }
  ]
};
```

## Notes for AI agents

- Do not assume a backend exists.
- If editing recipe data, prefer updating the `allRecipes` array in `data/recipes.js` rather than inventing a new persistence layer.
- If you change aisle names, keep them consistent with the references in `shopping-list-result.js`.
- The UI is intentionally simple and script-driven; the app is not component-based.
- Be careful around global variables and script load order: the scripts are included in a fixed sequence at the end of `index.html`.

## Quick start

Open `index.html` in a browser and use the navigation items:

- `Lijst maken` to build a shopping list
- `Recepten` to maintain recipes
- `Gangpaden` to assign ingredient aisles

The app is designed for local use in the browser and is intentionally lightweight.
