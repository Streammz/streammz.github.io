// Import
var allRecipes;
var switchPage;

// Export
var renderShoppingList;

(function () {
    var $root = $("#shopping-list");
    var $recipes = $("#recipes-container", $root);
    var $saveButton = $("#save-button", $root);

    var $templateRecipeCategoryHeader = $("#template-recipe-category-header", $root).html();
    var $templateRecipeBlock = $("#template-recipe-block", $root).html();

    $(function () {
        $saveButton.on('click', onSave);
    });

    renderShoppingList = function () {
        var categories = allRecipes.map((val) => val.category).filter(arrDistinct);

        $recipes.empty();
        for (var category of categories) {
            buildHeader(category).appendTo($recipes);

            var recipes = allRecipes
                .filter((val) => val.category == category)
                .sort(function (a, b) {
                    return a.name > b.name ? 1 : -1
                });
            for (var recipe of recipes) {
                buildRecipeBlock(recipe).appendTo($recipes);
            }
        }
    }

    function buildHeader(category) {
        var result = $($templateRecipeCategoryHeader);
        result.find('.name').text(category);
        return result;
    }

    function buildRecipeBlock(recipe) {
        var result = $($templateRecipeBlock);
        result.find('.name').text(recipe.name);
        result.find('.card').on('click', function () {
            var input = result.find('input[type=checkbox]');
            input.prop('checked', !input.is(':checked'));
        });
        result.data('recipe', recipe);
        return result;
    }

    function generateSaveResult() {
        var selectedRecipes = $recipes.find('.recipe')
            .filter((_, elem) => $('input[type=checkbox]', elem).is(':checked'))
            .map((_, elem) => $(elem).data('recipe'))
            .toArray();
        var ingredients = [];
        for (var recipe of selectedRecipes) {
            for (var ingredient of recipe.ingredients) {
                var existingIngredient = ingredients.filter((el) => el.ingredient == ingredient.ingredient && el.quantityType == ingredient.quantityType)[0];
                if (existingIngredient != null) {
                    existingIngredient.quantity += ingredient.quantity;
                } else {
                    ingredients.push(ingredient);
                }
            }
        }
        return ingredients;
    }

    function onSave() {
        var saved = generateSaveResult();
        switchPage('shoppingListResult', saved);
    }
})();