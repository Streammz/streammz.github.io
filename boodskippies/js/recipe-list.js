// Import
var allRecipes;
var arrDistinct;
var switchPage;

// Export
var renderRecipesList;

(function () {
    var $root = $("#recipe-list");
    var $recipes = $("#recipes-container", $root);
    var $addButton = $("#add-button", $root);
    var $saveButton = $("#save-button", $root);

    var $templateRecipeCategoryHeader = $("#template-recipe-category-header", $root).html();
    var $templateRecipeBlock = $("#template-recipe-block", $root).html();

    $(function () {
        $addButton.on('click', onAdd);
        $saveButton.on('click', onSave);
    });

    renderRecipesList = function () {
        var categories = allRecipes.map((val) => val.category).filter(arrDistinct);

        $recipes.empty();
        for (var category of categories) {
            buildHeader(category).appendTo($recipes);

            var recipes = allRecipes.filter((val) => val.category == category);
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
            switchPage('recipeDetails', recipe);
        });
        return result;
    }

    function onAdd() {
        switchPage('recipeNew');
    }

    function onSave() {
        navigator.clipboard.writeText('var allRecipes = ' + JSON.stringify(allRecipes, null, 2));
        alert('Gekopiëerd naar het klembord');
    }
})();