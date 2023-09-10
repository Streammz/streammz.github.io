
// Import
var switchPage;
var allRecipes;

// Export
var renderRecipeDetails;

(function () {
    var $root = $("#recipe-details");
    var $ingredientList = $("#ingredient-list tbody", $root);
    var $nameField = $("#recipe-name-field", $root);
    var $categoryField = $("#recipe-category-field", $root);

    var $saveButton = $("#save-button", $root);
    var $backButton = $("#back-button", $root);
    var $newIngredientButton = $("#new-ingredient-button", $root);

    var $templateIngredientRow = $("#template-ingredient-row", $root).html();

    var currentRecipe;

    $(function () {
        $saveButton.on('click', onSave);
        $backButton.on('click', onBack);
        $newIngredientButton.on('click', onNewIngredient);
    })

    renderRecipeDetails = function (recipe) {
        currentRecipe = recipe;
        
        $ingredientList.empty();
        $nameField.val(recipe ? recipe.name : '');
        $categoryField.val(recipe ? recipe.category : '');

        if (recipe) for (var ingredient of recipe.ingredients) {
            buildIngredientRow(ingredient).appendTo($ingredientList);
        }
    }

    function buildIngredientRow(ingredient) {
        var result = $($templateIngredientRow);

        result.find('[name=quantity]').val(ingredient.quantity);
        result.find('[name=quantityType]').val(ingredient.quantityType);
        result.find('[name=ingredient]').val(ingredient.ingredient);
        return result;
    }

    function generateSaveResult() {
        var result = {};
        result.name = $nameField.val();
        result.category = $categoryField.val();
        result.ingredients = $ingredientList.find('tr').map(function (_, elem) {
            var cur = {};
            cur.quantity = +$('[name=quantity]', elem).val();
            if ($('[name=quantityType]', elem).val()) {
                cur.quantityType = $('[name=quantityType]', elem).val();
            }
            cur.ingredient = $('[name=ingredient]', elem).val();
            return cur;
        }).toArray();
        return result;
    }

    function onSave() {
        var saved = generateSaveResult();
        if (currentRecipe) {
            allRecipes[allRecipes.indexOf(currentRecipe)] = saved;
        } else {
            allRecipes.push(saved);
        }
        onBack();
    }

    function onBack() {
        switchPage('recipes');
    }

    function onNewIngredient() {
        buildIngredientRow({ quantity: 1, ingredient: '' }).appendTo($ingredientList);
    }
})();