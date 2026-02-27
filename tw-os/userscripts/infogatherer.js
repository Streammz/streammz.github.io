// ==UserScript==
// @name         TW data
// @namespace    http://tampermonkey.net/
// @version      2026-02-11
// @description  try to take over the world!
// @author       You
// @match        https://nl112.tribalwars.nl/game.php?village=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tribalwars.nl
// @grant        none
// ==/UserScript==

(function($) {
    'use strict';

    var coordRegex = /\((\d{3})\|(\d{3})\)/;
    var expectedPages = [
        '&screen=overview_villages&mode=groups',
        '&screen=am_troops',
        '&screen=overview_villages&mode=units&type=support_detail&filter_villages=1',
        '&screen=overview_villages&mode=commands',
    ];

    var btnNext = $('<div class="quest" />').appendTo($(".questlog"));
    btnNext.css('background-image', 'url(https://cdn-icons-png.flaticon.com/16/545/545682.png)');
    btnNext.on('click', () => {
        var curPage = expectedPages
            .map((o, idx) => { return { o, idx }; })
            .filter(o => window.location.href.indexOf(o.o) > 0)[0];
        var nextPage = expectedPages[curPage ? (curPage.idx + 1) % expectedPages.length : 0];

        var href = window.location.href;
        var newUrl = href.substr(0, href.indexOf('village=') + 12);
        newUrl += nextPage;
        window.location.href = newUrl;
    });

    var btnCopy;
    if (window.location.href.indexOf(expectedPages[0]) > 0) {
        btnCopy = $('<div class="quest" />').appendTo($('.questlog'));
        btnCopy.css('background-image', 'url(https://cdn-icons-png.flaticon.com/16/1103/1103440.png)');
        btnCopy.on('click', () => {
            var selection = document.getSelection();
            var range = document.createRange()
            range.setStart($('#group_assign_table tbody tr:nth-child(2) td:first')[0].childNodes[2], 0);
            range.setEnd($('#group_assign_table tbody tr:last').prev().prev().find('td:last')[0].childNodes[0], 1);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
        });
    } else if (window.location.href.indexOf(expectedPages[1]) > 0) {
        btnCopy = $('<div class="quest" />').appendTo($('.questlog'));
        btnCopy.css('background-image', 'url(https://cdn-icons-png.flaticon.com/16/1103/1103440.png)');
        btnCopy.on('click', () => {
            var selection = document.getSelection();
            var range = document.createRange()
            range.setStart($('.overview_table tr.row_a:first td .village_anchor')[0].childNodes[0], 0);
            range.setEnd($('.overview_table tr.row_a:first').siblings().last().find('td:last')[0].childNodes[6], 1);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
        });
    } else if (window.location.href.indexOf(expectedPages[2]) > 0) {
        btnCopy = $('<div class="quest" />').appendTo($('.questlog'));
        btnCopy.css('background-image', 'url(https://cdn-icons-png.flaticon.com/16/1103/1103440.png)');
        btnCopy.on('click', () => {
            var selection = document.getSelection();
            var range = document.createRange()
            range.setStart($('#units_table tbody tr:first td:first .quickedit-label')[0].childNodes[0], 0);
            range.setEnd($('#units_table tbody tr:nth-last-child(3) td:last').prev()[0].childNodes[0], 1);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
        });
    } else if (window.location.href.indexOf(expectedPages[3]) > 0) {
        btnCopy = $('<div class="quest" />').appendTo($('.questlog'));
        btnCopy.css('background-image', 'url(https://cdn-icons-png.flaticon.com/16/1103/1103440.png)');
        btnCopy.on('click', () => {
            var trs = $('#commands_table tr.nowrap');

            var result = [];
            trs.each((idx, el) => {
                var category = $(el).find('.own_command').attr('data-command-type');
                var src, dst, troops;
                if (category == 'support') {
                    src = /(.*) \(/.exec($(el).find('td:nth-child(2) a').text())[1].trim();
                    dst = /Ondersteuning voor (.+) \(/.exec($(el).find('.quickedit').text())[1].trim();
                    troops = $(el).find('.unit-item').map((idx, el) => +$(el).text()).toArray();
                    result.push({ from: src, to: dst, troops });
                }
            });

            var textarea = document.createElement("textarea");
            textarea.textContent = JSON.stringify(result);
            textarea.style.position = "fixed";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        });
    }
})(window.jQuery);