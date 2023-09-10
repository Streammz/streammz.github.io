// Import
var allRecipes;
var renderRecipesList;
var renderRecipeDetails;
var renderShoppingList;
var renderShoppingListResult;
var renderAisles;

// Export
var arrDistinct;
var switchPage;
var quantityTypes;

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
        if (page == 'aisles') {
            renderAisles();
            switchPageInternal($("#aisles"));
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

    arrDistinct = (val, idx, arr) => arr.indexOf(val) === idx;
    quantityTypes = [
        { name: undefined, text: 'stuk(s)' },
        { name: 'gram', text: 'gram' },
        { name: 'liter', text: 'liter' },
    ]
})();