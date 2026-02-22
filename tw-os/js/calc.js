
var coordRegex = /\((\d{3})\|(\d{3})\)/;

$(function () {
    $('#calc').on('click', () => calc());
    readLocalStorage('groups');
    readLocalStorage('troops');
    readLocalStorage('prios');
    readLocalStorage('minimums');
    readLocalStorage('support');
    readLocalStorage('support-otw');
});

function calc() {
    storeLocalStorage('groups');
    storeLocalStorage('troops');
    storeLocalStorage('prios');
    storeLocalStorage('minimums');
    storeLocalStorage('support');
    storeLocalStorage('support-otw');

    var data = {};
    readGroups(data);
    readTroops(data);
    readPrios(data);
    readMinimums(data);
    readSupport(data);
    readSupportOnTheWay(data);

    calcAvailableTroops(data);
    calcWantedTroops(data);
    calcSurplusTroops(data);
    calcOptimalSupportExpectations(data);
    calcRemainderSupport(data);

    renderWantedTroops(data, 'wanted-outcome');
    renderSupport(data, 'support-outcome', data.expectedSupport);
    renderSupport(data, 'support-todo', data.remainingSupport);

    console.log(window.data = data);
}

function renderWantedTroops(data, tableName) {
    var table = $('#' + tableName).html('');
    var thead = $('<thead />').appendTo(table);
    var thRow = $('<tr />').appendTo(thead);
    thRow.append('<th>Town</th>')
    thRow.append('<th>Prio</th>')
    thRow.append($('<th>Troops</th>').attr('colspan', data.troopAmount));
    var tbody = $('<tbody />').appendTo(table);

    Object.keys(data.towns).forEach(key => {
        var row = $('<tr />').appendTo(tbody);
        $('<td />').text(key).appendTo(row);
        $('<td />').text(data.towns[key].prio).attr('title', data.towns[key].prioSrc).appendTo(row);
        data.towns[key].wantedTroops.forEach(val => $('<td />').text(val == -1 ? 0 : val).addClass(val <= 0 ? 'color-gray' : 'color-black').appendTo(row));
    });
}

function renderSupport(data, tableName, supportObj) {
    var table = $('#' + tableName).html('');
    var thead = $('<thead />').appendTo(table);
    var thRow = $('<tr />').appendTo(thead);
    thRow.append('<th>From</th>')
    thRow.append('<th>To</th>')
    thRow.append($('<th>Troops</th>').attr('colspan', data.troopAmount));
    var tbody = $('<tbody />').appendTo(table);

    var prevRowFrom;
    supportObj.forEach(support => {
        var row = $('<tr />').appendTo(tbody);
        if (prevRowFrom !== support.from) {
            var times = supportObj.filter(o => o.from == support.from).length;
            $('<td />').text(support.from).attr('rowspan', times).appendTo(row);
            prevRowFrom = support.from
        }
        $('<td />').text(support.to).appendTo(row);
        support.troops.forEach(val => $('<td />').text(val).addClass(val == 0 ? 'color-gray' : val > 0 ? 'color-black' : 'color-red').appendTo(row));
    });
}

function calcAvailableTroops(data) {
    data.availableTroops = Array(data.troopAmount).fill(0);
    data.sortedTowns.forEach(town => {
        town.currentTroops.forEach((val, idx) => data.availableTroops[idx] += val);
    });
}

function calcWantedTroops(data) {
    data.spentTroops = Array(data.troopAmount).fill(0);
    
    // Spend minimum troops first
    data.sortedTowns.forEach((town, townIdx) => {
        town.wantedTroops = Array(data.troopAmount).fill(0);
        for (var i=0; i<data.troopAmount; i++) {
            if (data.minimums[i] > 0) {
                var neededForAllTowns = data.minimums[i] * data.townCount;
                var spend;
                if (data.availableTroops[i] < neededForAllTowns) {
                    spend = Math.floor(data.availableTroops[i] / data.townCount) + (data.availableTroops[i] % data.townCount < townIdx ? 0 : 1);
                }
                else {
                    spend = data.minimums[i];
                }
                data.spentTroops[i] += spend;
                town.wantedTroops[i] += spend;
            } else town.wantedTroops[i] = -1;
        }
    });
    data.spentTroops.forEach((o, idx) => data.availableTroops[idx] -= o);

    // Spend remaining troops
    data.totalPrio = data.sortedTowns.reduce((a, b) => a + b.prio, 0)
    data.sortedTowns.forEach((town, townIdx) => {
        for (var i=0; i<data.troopAmount; i++) {
            if (data.minimums[i] >= 0) {
                var portion = (data.totalPrio - data.townCount) / (town.prio - 1);
                var spend = Math.floor(data.availableTroops[i] / portion) + (data.availableTroops[i] % portion < townIdx ? 0 : 1);
                data.spentTroops[i] += spend;
                town.wantedTroops[i] += spend;
            }
        }
    });
}

function calcSurplusTroops(data) {
    data.sortedTowns.forEach(town => {
        town.surplus = subtractTroops(data, town.currentTroops, town.wantedTroops);
        town.wantedTroops.forEach((val, idx) => val == -1 && (town.surplus[idx] = 0));
    });
}

function calcOptimalSupportExpectations(data) {
    data.expectedSupport = [];
    data.sortedTowns.forEach(town => {
        var closestTowns;
        town.surplus.forEach((surplus, surplusIdx) => {
            if (surplus > 0) {
                closestTowns = closestTowns || ([... data.sortedTowns].sort((a, b) => calcDist(town, a) - calcDist(town, b)));
                // Find the best towns to send these to
                for (var i=0; i<closestTowns.length && surplus > 0; i++) {
                    if (closestTowns[i].surplus[surplusIdx] < 0) {
                        var toGive = Array(data.troopAmount).fill(0);
                        toGive[surplusIdx] = Math.min(-closestTowns[i].surplus[surplusIdx], surplus);
                        data.expectedSupport.push({ from: town.name, to: closestTowns[i].name, troops: toGive });

                        closestTowns[i].surplus = addTroops(data, closestTowns[i].surplus, toGive);
                        town.surplus = subtractTroops(data, town.surplus, toGive);
                        surplus -= toGive[surplusIdx];
                    }
                }
            }
        });
    });

    data.expectedSupport = mergeSupports(data, data.expectedSupport);
    data.expectedSupport.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
}

function calcRemainderSupport(data) {
    data.remainingSupport = [];

    // Remove excess support
    data.support.forEach(support => {
        var excessSupport = support.troops;
        var expectedSupport = data.expectedSupport.filter(o => o.from == support.from && o.to == support.to)[0];
        if (expectedSupport) {
            excessSupport = subtractTroops(data, excessSupport, expectedSupport.troops);
        }

        excessSupport = excessSupport.map(o => o <= 0 ? 0 : -o);
        if (excessSupport.filter(o => o < 0).length)
            data.remainingSupport.push({ from: support.from, to: support.to, troops: excessSupport });
    });

    // Add missing support
    data.expectedSupport.forEach(support => {
        var supportToSend = support.troops;
        var existingSupport = data.support.filter(o => o.from == support.from && o.to == support.to)[0];
        if (existingSupport) {
            supportToSend = subtractTroops(data, supportToSend, existingSupport.troops);
        }

        supportToSend = supportToSend.map(o => o > 0 ? o : 0);
        if (supportToSend.filter(o => o > 0).length)
            data.remainingSupport.push({ from: support.from, to: support.to, troops: supportToSend });
    });

    data.remainingSupport = mergeSupports(data, data.remainingSupport);
    data.remainingSupport = seperateSupportIntoPositiveNegative(data, data.remainingSupport);
    data.remainingSupport.sort((a, b) => sorter(a).localeCompare(sorter(b)));

    function sorter(x) {
        var isBackSupport = x.troops.filter(o => o > 0).length == 0;
        return x.from + '-' + (isBackSupport ? 'a' : 'b') + '-' + x.to;
    }
}

function readGroups(data) {
    data.towns = data.towns || {};
    var val = $('#groups').val();
    var lines = val.split(/[\r\n\t]+/);

    for (var i=0; i<lines.length; i++) {
        var regexResult = coordRegex.exec(lines[i]);
        if (regexResult) {
            var name = lines[i].substr(0, regexResult.index).trim();
            var coords = { x: +regexResult[1], y: +regexResult[2] };
            curTown = (data.towns[name] || (data.towns[name] = { name, coords }));


            curTown.groups = lines[i+4].split('; ');
            curTown.points = +lines[i+2].replace(/[^\d]/g, '');
            i += 5;
            continue;
        }
    }
    data.townCount = Object.keys(data.towns).length;
}

function readTroops(data) {
    data.towns = data.towns || {};
    var val = $('#troops').val();
    var lines = val.split(/[\r\n\t]+/);

    var curTown = {};
    for (var i=0; i<lines.length; i++) {
        var regexResult = coordRegex.exec(lines[i]);
        if (regexResult) {
            var name = lines[i].substr(0, regexResult.index).trim();
            var coords = { x: +regexResult[1], y: +regexResult[2] };
            curTown = (data.towns[name] || (data.towns[name] = { name, coords }));
            i++; // Skip the resources data point
            continue;
        }

        (curTown.currentTroops || (curTown.currentTroops = [])).push(+lines[i]);
        (curTown.expectedTroops || (curTown.expectedTroops = [])).push(+lines[i+1] == 0 ? +lines[i] : +lines[i+1]);
        i++; // Already read the next data point, skip it
    }

    data.troopAmount = data.towns[Object.keys(data.towns)[0]].currentTroops.length;
}

function readMinimums(data) {
    var val = $('#minimums').val();
    var lines = val.split(/[\r\n\t ]+/);

    var minimums = (data.minimums = (data.minimums || []));
    for (var i=0; i<lines.length; i++) {
        minimums.push(+lines[i]);
    }
}

function readPrios(data) {
    data.prios = data.prios || [];
    var val = $('#prios').val();
    var lines = val.split(/[\r\n]+/);

    for (var i=0; i<lines.length; i++) {
        var lineData = lines[i].split(';').map(o => o.trim())
        var prio = +lineData[0];
        var pointTreshold = /^\d+$/.test(lineData[1]) ? +lineData[1] : 0;
        var groups = lineData.slice(pointTreshold > 0 ? 2 : 1);
        data.prios.push({ prio, pointTreshold, groups, src: lines[i] });
    }

    Object.keys(data.towns).forEach(key => {
        var town = data.towns[key];        
        var prio = (data.prios.filter(p => {
            if (town.points <= p.pointTreshold) return false;
            if (p.groups.filter(pg => town.groups.filter(tg => tg == pg).length > 0).length < p.groups.length) return false;
            return true;
        })[0] || { prio: 1, src: 'none' });
        data.towns[key].prio = prio.prio;
        data.towns[key].prioSrc = prio.src;
    });

    data.sortedTowns = Object.keys(data.towns).map(o => data.towns[o]).sort((t1, t2) => t2.prio - t1.prio);
}

function readSupport(data) {
    data.support = data.support || [];
    var val = $('#support').val();
    var lines = val.split(/[\r\n\t]+/);

    var dstTown;
    for (var i=0; i<lines.length; i++) {
        var regexResult = coordRegex.exec(lines[i]);
        if (regexResult) {
            var name = lines[i].substr(0, regexResult.index).trim();
            var tag = lines[++i];
            if (tag == "in het dorp") {
                dstTown = name;
                i += data.troopAmount; // Skip troop data points
                i++; // Skip noble data point
                continue;
            }

            var troops = [];
            for (var t=0; t<data.troopAmount; t++) {
                troops.push(+lines[++i])
            }
            data.support.push({ from: name, to: dstTown, troops });
            i++; // Skip noble data point
        }
    }
}

function readSupportOnTheWay(data) {
    data.support = data.support || [];
    var val = $('#support-otw').val();

    var valJson = JSON.parse(val);
    data.support = [... data.support, ... valJson];
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

function addTroops(data, args) {
    var result = Array(data.troopAmount).fill(0);
    Array.from(arguments).forEach((list, idx) => 
        idx > 0 && list.forEach((troop, idx) => result[idx] += troop));
    return result;
}

function subtractTroops(data, args) {
    var result = Array(data.troopAmount).fill(0);
    Array.from(arguments).forEach((list, idx) => {
        if (idx == 0) return;
        if (idx == 1) {
            list.forEach((troop, idx) => result[idx] = troop);
            return;
        }
        list.forEach((troop, idx) => result[idx] -= troop);
    });
    return result;
}

function calcDist(c1, c2) {
    if (c1.name) c1 = c1.coords;
    if (c2.name) c2 = c2.coords;

    var xDiff = Math.abs(c1.x - c2.x);
    var yDiff = Math.abs(c1.y - c2.y);
    return Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
}

function mergeSupports(data, supports) {
    var groups = Object.groupBy(supports, o => o.from + ' -> ' + o.to);
    return Object.keys(groups).map(groupKey => {
        var subSupports = groups[groupKey];
        return { 
            from: subSupports[0].from, 
            to: subSupports[0].to,
            troops: addTroops.apply(this, [data, ...subSupports.map(o => o.troops)])
        };
    });
}

function seperateSupportIntoPositiveNegative(data, supports) {
    return supports.map(support => {
        if (support.troops.filter(o => o > 0).length && support.troops.filter(o => o < 0).length) {
            return [
                {
                    from: support.from, 
                    to: support.to,
                    troops: support.troops.map(o => o < 0 ? o : 0),
                },
                {
                    from: support.from, 
                    to: support.to,
                    troops: support.troops.map(o => o > 0 ? o : 0),
                }
            ];
        }
        return [ support ];
    }).flatMap(supportList => supportList);
}