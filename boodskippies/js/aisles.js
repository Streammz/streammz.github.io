
// Import
var allRecipes;
var aisleInfo;

// Export
var renderAisles;

(function () {
    var $root = $("#aisles");
    var $ingredientsList = $("#ingredient-list tbody", $root);
    var $saveButton = $("#save-button", $root);

    var $templateIngredientRow = $("#template-ingredient-row", $root).html();

    var allIngredients;

    $(function () {
        $saveButton.on('click', onSave);
    });

    renderAisles = function () {
        allIngredients = allRecipes.map((val) => val.ingredients.map((o) => o.ingredient))
            .concat(allRecipes.map((val) => (val.optionalIngredients || []).map((o) => o.ingredient)))
            .reduce((a, b) => a.concat(b))
            .filter(arrDistinct)
            .sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);

        $ingredientsList.empty();
        for (var ingredient of allIngredients) {
            buildIngredientRow(ingredient).appendTo($ingredientsList);
        }
        console.log(allIngredients);
    }

    function buildIngredientRow(ingredient) {
        var result = $($templateIngredientRow);
        result.find('.name').text(ingredient);
        for (var aisle of aisleInfo.aisles) {
            $("<option></option>").text(aisle).appendTo(result.find('.value'))
        }
        var value = aisleInfo.ingredients.filter((o) => o.name == ingredient)[0];
        if (value) {
            result.find('.value').val(value.aisle);
        }
        return result;
    }

    function generateSaveResult() {
        var result = {};
        result.aisles = aisleInfo.aisles;
        result.ingredients = $ingredientsList.find('tr').map(function (_, elem) {
            return {
                name: $(elem).find('.name').text(),
                aisle: $(elem).find('.value').val() || null,
            };
        }).toArray();
        return result;
    }

    function onSave() {
        navigator.clipboard.writeText('var aisleInfo = ' + JSON.stringify(generateSaveResult(), null, 2));
        alert('Gekopiëerd naar het klembord');
    }
})();