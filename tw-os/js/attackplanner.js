
var coordRegex = /(\d{3})\|(\d{3})/;

$(function () {
    $('#calc').on('click', () => calc());
    readLocalStorage('troops');
    readLocalStorage('noblers');
    readLocalStorage('nobletargets');
    readLocalStorage('targets');
    readLocalStorage('faketargets');
});

function calc() {
    storeLocalStorage('troops');
    storeLocalStorage('noblers');
    storeLocalStorage('nobletargets');
    storeLocalStorage('targets');
    storeLocalStorage('faketargets');

    var data = {};
    readTroops(data);
    readNoblers(data);
    readTargets(data);

    calcTravelTimes(data);

    renderTravelTimes(data);

    console.log(window.data = data);
}

function renderTravelTimes(data) {
    var table = $('#time-chart').html('');
    var thead = $('<thead />').appendTo(table);
    var thRow = $('<tr />').appendTo(thead);
    $('<th />').appendTo(thRow);
    var tbody = $('<tbody />').appendTo(table);
    data.targets.forEach(target => {
        $('<th />')
            .html(target.name + '<br />' + target.coords.x + '|' + target.coords.y)
            .appendTo(thRow);

        });

    data.sortedTowns.forEach(town => {
        var row = $('<tr />').appendTo(tbody);
        $('<th />').text(town.name).appendTo(row);
        data.targets.forEach(target => {
            var td = $('<td>').appendTo(row);
            var addTime = (time, unit) => {
                $('<span />')
                    .text(timeToString(time)).addClass('time time-' + unit)
                    .attr('data-time', time)
                    .appendTo(td);
            };
            if (town.currentTroops[5] > 0)
                addTime(target.travelTimes[town.name].lc, 'lc')
            if (town.currentTroops[0] > 0 || town.currentTroops[2] > 0 || town.currentTroops[3] > 0)
                addTime(target.travelTimes[town.name].axe, 'axe')
            if (town.currentTroops[1] > 0)
                addTime(target.travelTimes[town.name].sword, 'sword')
            if (town.currentTroops[8] > 0)
                addTime(target.travelTimes[town.name].ram, 'ram')
            if (town.nobler)
                addTime(target.travelTimes[town.name].noble, 'noble')
        });
    });

    table.on('mouseover', '.time', (ev) => {
        $(table).find('.hover-highlight').removeClass('hover-highlight');
        
        var timeToMatch = $(ev.target).data('time');
        tbody.find('td').each((idx, td) => {
            var each = $(td).find('[data-time]').map((idx, el) => { 
                var time = +$(el).attr('data-time');
                var diff = Math.abs(time - timeToMatch);
                return { el, time, diff }; 
            }).toArray();
            each.sort((a, b) => a.diff - b.diff);
            
            $(each[0].el).addClass('hover-highlight');
        })
    });
    table.on('click', '.time', (ev) => {
        $(ev.target).toggleClass('highlight');
    });
}

function readTroops(data) {
    data.towns = data.towns || {};
    var val = $('#troops').val();
    var lines = val.split(/[\r\n\t]+/);

    var curTown = {};
    for (var i=0; i<lines.length; i++) {
        var regexResult = coordRegex.exec(lines[i]);
        if (regexResult) {
            var name = lines[i].substr(0, regexResult.index-1).trim();
            var coords = { x: +regexResult[1], y: +regexResult[2] };
            curTown = (data.towns[name] || (data.towns[name] = { name, coords }));
            i++; // Skip the resources data point
            continue;
        }

        (curTown.currentTroops || (curTown.currentTroops = [])).push(+lines[i]);
        (curTown.expectedTroops || (curTown.expectedTroops = [])).push(+lines[i+1] == 0 ? +lines[i] : +lines[i+1]);
        i++; // Already read the next data point, skip it
    }

    Object.keys(data.towns).forEach(townKey => {
        var town = data.towns[townKey];
        town.armySize = (town.currentTroops[2]) + (town.currentTroops[5] * 4) + (town.currentTroops[6] * 5);
    });
    data.sortedTowns = Object.keys(data.towns).map(key => data.towns[key]).sort((a, b) => b.armySize - a.armySize);
}

function readNoblers(data) {
    var val = $('#noblers').val();
    var result, regex = /\((\d{3})\|(\d{3})\)/g;

    while ((result = regex.exec(val)) !== null) {
        var coords = { x: result[1], y: result[2] };
        var matchedTown = Object.keys(data.towns).filter(key => data.towns[key].coords.x == coords.x && data.towns[key].coords.y == coords.y)[0];
        data.towns[matchedTown].nobler = true;
    }
}

function readTargets(data) {
    var val = $('#targets').val();
    var lines = val.split(/[\r\n\t]+/);

    for (var i=0; i<lines.length; i++) {
        var regexResult = coordRegex.exec(lines[i]);
        if (regexResult) {
            var name = lines[i-1].trim();
            var coords = { x: +regexResult[1], y: +regexResult[2] };
            var points = +(''+lines[i+1]).replace(/[^\d]/g, '');
            (data.targets || (data.targets = [])).push({ name, coords, points });
            continue;
        }
    }
}

function calcTravelTimes(data) {
    data.targets.forEach(target => {
        target.travelTimes = {};
        data.sortedTowns.forEach(town => {
            var distance = calcDist(target.coords, town);
            target.travelTimes[town.name] = {
                distance,
                lc: Math.floor(distance * 600),
                axe: Math.floor(distance * 1080),
                sword: Math.floor(distance * 1320),
                ram: Math.floor(distance * 1800),
                noble: Math.floor(distance * 2100),
            };
        });
    });
}

function calcDist(c1, c2) {
    if (c1.name) c1 = c1.coords;
    if (c2.name) c2 = c2.coords;

    var xDiff = Math.abs(c1.x - c2.x);
    var yDiff = Math.abs(c1.y - c2.y);
    return Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
}

function timeToString(seconds) {
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds / 60) % 60);
    var seconds = Math.floor(seconds % 60);

    return hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

function storeLocalStorage(name) {
    var val = $('#' + name).val();
    localStorage.setItem('history-' + name, val);
}

function readLocalStorage(name) {
    if (localStorage['history-' + name]) {
        $('#' + name).val(localStorage['history-' + name]);
    }
}