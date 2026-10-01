// Import
var allRecipes;
var renderRecipesList;
var renderRecipeDetails;
var renderShoppingList;
var renderShoppingListResult;
var renderIngredientInfo;

// Export
var arrDistinct;
var switchPage;
var quantityTypes;
var getJumboProductUrl;

(function () {

    $(function () {
        switchPage('shoppingList');
    })

    switchPage = function (page) {
        if (page == 'recipes') {
            renderRecipesList();
            switchPageInternal($("#recipe-list"));
        }
        if (page == 'recipeDetails') {
            renderRecipeDetails(arguments[1]);
            switchPageInternal($("#recipe-details"));
        }
        if (page == 'recipeNew') {
            renderRecipeDetails(null);
            switchPageInternal($("#recipe-details"));
        }
        if (page == 'shoppingList') {
            renderShoppingList();
            switchPageInternal($("#shopping-list"));
        }
        if (page == 'shoppingListResult') {
            renderShoppingListResult(arguments[1]);
            switchPageInternal($("#shopping-list-result"));
        }
        if (page == 'ingredientInfo') {
            renderIngredientInfo();
            switchPageInternal($("#ingredient-info"));
        }
    }

    function switchPageInternal($page) {
        $(".app-page").hide();
        $page.show();
    }

    $(function () {
        $("#navbarNav .nav-link").on('click', function (e) {
            e.preventDefault();
            switchPage($(this).data('page'));
            $("#navbarNav .nav-item.active").removeClass('active');
            $(this).parent().addClass('active');
        })
    })

    getJumboProductUrl = function (value) {
        try {
            var url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol) ||
                !['jumbo.com', 'www.jumbo.com'].includes(url.hostname) ||
                url.username || url.password ||
                !/^\/producten\/[^/]+\/?$/.test(url.pathname)) {
                return '';
            }
            return url.href;
        } catch {
            return '';
        }
    }

    arrDistinct = (val, idx, arr) => arr.indexOf(val) === idx;
    quantityTypes = [
        { name: undefined, text: 'stuk(s)' },
        { name: 'gram', text: 'gram' },
        { name: 'liter', text: 'liter' },
    ]
})();