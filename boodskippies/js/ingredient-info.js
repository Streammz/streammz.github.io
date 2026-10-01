
// Import
var allRecipes;
var ingredientInfo;

// Export
var renderIngredientInfo;

(function () {
    var $root = $("#ingredient-info");
    var $ingredientsList = $("#ingredient-list tbody", $root);
    var $saveButton = $("#save-button", $root);

    var $templateIngredientRow = $("#template-ingredient-row", $root).html();

    var allIngredients;

    $(function () {
        $saveButton.on('click', onSave);
        $root.on('dragover', '.jumbo-sku', function (event) {
            event.preventDefault();
        });
        $root.on('drop', '.jumbo-sku', function (event) {
            event.preventDefault();
            var transfer = event.originalEvent.dataTransfer;
            var link = (transfer.getData('text/uri-list') || transfer.getData('text/plain'))
                .split(/\r?\n/)
                .map((line) => line.trim())
                .find((line) => line && !line.startsWith('#'));
            var sku = extractJumboSku(link);
            if (sku) {
                $(this).val(sku).trigger('input');
                this.focus();
            }
        });
    });

    function extractJumboSku(link) {
        try {
            var url = new URL(link);
            if (!['http:', 'https:'].includes(url.protocol) ||
                !['jumbo.com', 'www.jumbo.com'].includes(url.hostname)) {
                return '';
            }
            var segments = url.pathname.split('/');
            if (segments[1] !== 'producten' || !segments[2]) {
                return '';
            }
            var slug = segments[2];
            var separator = slug.lastIndexOf('-');
            return separator < 0 ? '' : slug.slice(separator + 1);
        } catch {
            return '';
        }
    }

    renderIngredientInfo = function () {
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
        for (var aisle of ingredientInfo.aisles) {
            $("<option></option>").text(aisle).appendTo(result.find('.value'))
        }
        var value = ingredientInfo.ingredients.filter((o) => o.name == ingredient)[0];
        if (value) {
            result.find('.value').val(value.aisle);
            result.find('.jumbo-sku').val(value.jumboSku || '');
        }
        return result;
    }

    function generateSaveResult() {
        var result = {};
        result.aisles = ingredientInfo.aisles;
        result.ingredients = $ingredientsList.find('tr').map(function (_, elem) {
            var ingredient = {
                name: $(elem).find('.name').text(),
                aisle: $(elem).find('.value').val() || null,
            };
            var jumboSku = $(elem).find('.jumbo-sku').val().trim();
            if (jumboSku) {
                ingredient.jumboSku = jumboSku;
            }
            return ingredient;
        }).toArray();
        return result;
    }

    function onSave() {
        navigator.clipboard.writeText('var ingredientInfo = ' + JSON.stringify(generateSaveResult(), null, 2));
        alert('Gekopiëerd naar het klembord');
    }
})();