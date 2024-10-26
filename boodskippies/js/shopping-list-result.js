
// Import

// Export
var renderShoppingListResult;
var generatedIngredients;

(function () {
    var $root = $("#shopping-list-result");

    var $ingredientsList = $("#ingredients-list", $root);

    renderShoppingListResult = function (ingredients) {
        generatedIngredients = ingredients;
        $ingredientsList.empty();
        buildGroupedIngredients(ingredients).appendTo($ingredientsList);
    }

    function buildGroupedIngredients(ingredients) {
        var groups = ingredients
            .map(function (val) { 
                var aisle = aisleInfo.ingredients.filter((o) => o.name == val.ingredient)[0].aisle;
                return { ingredient: val, aisle: aisle };
            })
            .sort(function (a, b) {
                var aIndex = aisleInfo.aisles.indexOf(a.aisle);
                var bIndex = aisleInfo.aisles.indexOf(b.aisle);
                return aIndex > bIndex ? 1 : -1;
            }).reduce(function (result, cur) {
                result[cur.aisle] = result[cur.aisle] || [];
                result[cur.aisle].push(cur.ingredient);
                return result;
            }, {});
        
        var sortedGroups = Object.keys(groups).sort(function (a, b) {
            var aIndex = aisleInfo.aisles.indexOf(a);
            var bIndex = aisleInfo.aisles.indexOf(b);
            return aIndex > bIndex ? 1 : -1;
        });

        var result = $('<ul></ul>');
        for (var key of sortedGroups) {
            var $li = $("<li></li>").text(key).appendTo(result);
            var $ul = $("<ul></ul>").appendTo($li);
            for (var ingredient of groups[key]) {
                buildIngredientRow(ingredient).appendTo($ul);
            }
        }
        return result.children();
    }

    function buildIngredientRow(ingredient) {
        var result = $('<li></li>');
        if (ingredient.optional) {
            result.addClass('text-muted font-italic font-weight-light');
        }
        result.text(`${generateQuantityText(ingredient)} ${ingredient.ingredient}${ingredient.optional ? '?' : ''}`.trim());
        result.attr('title', `Nodig voor de volgende recepten:\r\n- ${ingredient.recipes.join('\r\n- ')}`);
        return result;
    }

    function generateQuantityText(ingredient) {
        if (ingredient.quantity == 1 || ingredient.optional) {
            return '';
        }
        if (!ingredient.quantityType) {
            return `${ingredient.quantity}x`;
        }
        return `${ingredient.quantity} ${quantityTypes.filter((val) => val.name == ingredient.quantityType)[0].text}`;
    }
})();