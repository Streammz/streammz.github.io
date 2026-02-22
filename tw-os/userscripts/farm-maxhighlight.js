// ==UserScript==
// @name         TW farm max highlighter
// @namespace    http://tampermonkey.net/
// @version      2026-02-11
// @description  try to take over the world!
// @author       You
// @match        https://nl112.tribalwars.nl/game.php?*screen=am_farm
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tribalwars.nl
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var $ = window.jQuery;
    var run = function() {
        var aboveMax = $('[data-units-forecast]').filter(function (idx, elem) {
            var data = JSON.parse($(elem).attr('data-units-forecast'));
            return data.light > 50;
        });
        console.log($('[data-units-forecast]').length, aboveMax.length)

        aboveMax.css({ border: '2px solid red', 'background-color': 'red' })
    };

    run();
    setInterval(run, 5000);
})();