
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
                var info = ingredientInfo.ingredients.find((item) => item.name == val.ingredient);
                var aisle = (info && info.aisle) || 'Overig';
                return { ingredient: val, aisle: aisle };
            })
            .sort(function (a, b) {
                var aIndex = ingredientInfo.aisles.indexOf(a.aisle);
                var bIndex = ingredientInfo.aisles.indexOf(b.aisle);
                return aIndex > bIndex ? 1 : -1;
            }).reduce(function (result, cur) {
                result[cur.aisle] = result[cur.aisle] || [];
                result[cur.aisle].push(cur.ingredient);
                return result;
            }, {});
        
        var sortedGroups = Object.keys(groups).sort(function (a, b) {
            var aIndex = ingredientInfo.aisles.indexOf(a);
            var bIndex = ingredientInfo.aisles.indexOf(b);
            return aIndex > bIndex ? 1 : -1;
        });

        var result = $('<div></div>');
        for (var key of sortedGroups) {
            var $section = $('<section class="shopping-aisle"></section>').appendTo(result);
            $('<h2 class="shopping-aisle-heading"></h2>').text(key).appendTo($section);
            var $ul = $('<ul class="shopping-items"></ul>').appendTo($section);
            for (var ingredient of groups[key]) {
                buildIngredientRow(ingredient).appendTo($ul);
            }
        }
        return result.children();
    }

    function buildIngredientRow(ingredient) {
        var result = $('<li class="shopping-item"></li>');
        var $label = $('<label class="shopping-item-label"></label>').appendTo(result);
        $('<input type="checkbox" class="shopping-item-check" />').appendTo($label);
        var $text = $('<span class="shopping-item-text"></span>').appendTo($label);
        if (ingredient.optional) {
            $text.addClass('text-muted font-italic');
        }
        $text.text(`${generateQuantityText(ingredient)} ${ingredient.ingredient}${ingredient.optional ? '?' : ''}`.trim());
        $label.attr('title', `Nodig voor de volgende recepten:\r\n- ${ingredient.recipes.join('\r\n- ')}`);
        var info = ingredientInfo.ingredients.find((item) => item.name == ingredient.ingredient);
        if (info && info.jumboSku) {
            var linkLabel = `${ingredient.ingredient} bij Jumbo (opent in nieuw tabblad)`;
            $('<a class="shopping-jumbo-link" target="_blank" rel="noopener noreferrer"></a>')
                .attr('href', 'https://www.jumbo.com/producten/product-' + encodeURIComponent(info.jumboSku))
                .attr('aria-label', linkLabel)
                .attr('title', linkLabel)
                .append(lucide.createElement(lucide.icons.Truck, { 'aria-hidden': 'true', width: 22, height: 22 }))
                .appendTo(result);
        }
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