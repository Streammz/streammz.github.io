
var coordRegex = /\((\d{3})\|(\d{3})\)/;

$(function () {
    $('#calc').on('click', () => calc());
    readLocalStorage('groups');
    readLocalStorage('troops');
    readLocalStorage('prios');
    readLocalStorage('trooprules');
    readLocalStorage('support');
    readLocalStorage('support-otw');
});

function calc() {
    storeLocalStorage('groups');
    storeLocalStorage('troops');
    storeLocalStorage('prios');
    storeLocalStorage('trooprules');
    storeLocalStorage('support');
    storeLocalStorage('support-otw');

    var data = {};
    readGroups(data);
    readTroops(data);
    readPrios(data);
    readTroopRules(data);
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
        town.wantedTroops = Array(data.troopAmount).fill(0);
    });
}

function calcWantedTroops(data) {
    for (var troopIdx=0; troopIdx<data.troopAmount; troopIdx++) {
        var rule = data.troopRules[troopIdx];

        if (rule.keepIfAbove) {
            data.sortedTowns.forEach((town) => {
                if (town.currentTroops[troopIdx] > rule.keepIfAbove) {
                    data.availableTroops[troopIdx] -= town.currentTroops[troopIdx];
                    town.wantedTroops[troopIdx] += town.currentTroops[troopIdx];
                }
            });
        }

        if (rule.keepIfAvailable) {
            data.sortedTowns.forEach((town) => {
                if (town.wantedTroops[troopIdx] < rule.keepIfAvailable && town.currentTroops[troopIdx] > town.wantedTroops[troopIdx]) {
                    var spend = Math.min(town.currentTroops[troopIdx], rule.keepIfAvailable);
                    spend -= town.wantedTroops[troopIdx];

                    data.availableTroops[troopIdx] -= spend;
                    town.wantedTroops[troopIdx] += spend;
                }
            })
        }

        if (rule.minimum) {
            var neededForAllTowns = data.sortedTowns.reduce((a, b) => a + Math.max(0, rule.minimum - b.wantedTroops[troopIdx]), 0);
            if (data.availableTroops[troopIdx] >= neededForAllTowns) {
                // We can fill up minimums for all towns
                data.sortedTowns.forEach((town) => {
                    if (town.wantedTroops[troopIdx] < rule.minimum) {
                        var spend = rule.minimum - town.wantedTroops[troopIdx];
                        data.availableTroops[troopIdx] -= spend;
                        town.wantedTroops[troopIdx] += spend;
                    }
                });
            } else {
                // We can't fill up minimums, try to fill up as best as we can.
                var townsToFill = data.sortedTowns.filter(town => town.wantedTroops[troopIdx] < rule.minimum);
                townsToFill.sort((a, b) => a.wantedTroops[troopIdx] - b.wantedTroops[troopIdx]);

                for (var i=1; i<townsToFill.length+1; i++) {
                    var diff = (i == townsToFill.length ? rule.minimum : townsToFill[i].wantedTroops[troopIdx]) - townsToFill[i-1].wantedTroops[troopIdx];
                    var toAdd = diff * i;
                    if (toAdd <= data.availableTroops[troopIdx]) {
                        for (var j=0; j<i; j++) {
                            townsToFill[j].wantedTroops[troopIdx] += diff
                            data.availableTroops[troopIdx] -= diff;
                        }
                    }
                    else {
                        diff = Math.floor(data.availableTroops[troopIdx] / i);
                        var roundOffIndex = data.availableTroops[troopIdx] % i;
                        for (var j=0; j<i; j++) {
                            townsToFill[j].wantedTroops[troopIdx] += diff + (roundOffIndex > j ? 1 : 0);
                            data.availableTroops[troopIdx] -= diff + (roundOffIndex > j ? 1 : 0);
                        }
                        break;
                    }
                }
            }
        }

        if (rule.isActive) {
            var totalPrio = data.sortedTowns.reduce((a, b) => a + b.prio, 0);
            var availableAtStart = data.availableTroops[troopIdx];
            data.sortedTowns.forEach((town, townIdx) => {
                var portion = (totalPrio - data.townCount) / (town.prio - 1);
                var spend = Math.floor(availableAtStart / portion);
                data.availableTroops[troopIdx] -= spend;
                town.wantedTroops[troopIdx] += spend;
            });

            while (data.availableTroops[troopIdx] > 0) {
                data.sortedTowns.forEach((town, townIdx) => {
                    if (data.availableTroops[troopIdx] > 0) {
                        data.availableTroops[troopIdx] -= 1;
                        town.wantedTroops[troopIdx] += 1;
                    }
                })
            }
        }

        if (rule.maximumFromSupport) {
            var townsWithTooMuchSupport = data.sortedTowns.filter(town => 
                town.wantedTroops[troopIdx] > town.currentTroops[troopIdx] 
                && town.wantedTroops[troopIdx] > rule.maximumFromSupport);

            townsWithTooMuchSupport.forEach(town => {
                var howMuch = town.wantedTroops[troopIdx] - Math.max(rule.maximumFromSupport, town.currentTroops[troopIdx]);
                for (var i=0; i<data.townCount; i++) {
                    var targetTown = data.sortedTowns[i];
                    if (town == targetTown || targetTown.wantedTroops[troopIdx] <= rule.maximumFromSupport) continue;

                    var surplus = targetTown.currentTroops[troopIdx] - targetTown.wantedTroops[troopIdx];
                    if (surplus > 0) {
                        var sendBack = Math.min(surplus, howMuch);
                        town.wantedTroops[troopIdx] -= sendBack;
                        targetTown.wantedTroops[troopIdx] += sendBack;
                        howMuch -= sendBack;

                        if (howMuch <= 0) break;
                    }
                }
                if (howMuch > 0) {
                    town.wantedTroops[troopIdx] -= howMuch;
                    data.availableTroops[troopIdx] += howMuch;
                }
            });
        }
    }
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

function readTroopRules(data) {
    var val = $('#trooprules').val();
    var lines = val.split(/[\r\n]+/);

    var troopRules = (data.troopRules = (data.troopRules || []));
    for (var i=0; i<data.troopAmount; i++) {
        var rule = {};
        if (lines[i] && lines[i].trim() !== '-') {
            rule.isActive = true;
            var tokens = lines[i].split(/[\t ]+/);
            tokens.forEach(token => {
                if (/^\[\d+\]$/.exec(token)) rule.keepIfAvailable = +(token.substr(1, token.length-2));
                else if (/^\[>\d+\]$/.exec(token)) rule.keepIfAbove = +(token.substr(2, token.length-3));
                else if (/^\d+!$/.exec(token)) rule.maximumFromSupport = +(token.substr(0, token.length - 1));
                else if (/^\d+$/.exec(token)) rule.minimum = +token;
            });
        }
        troopRules.push(rule);
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

    data.support.forEach(sup => {
        while (sup.troops.length > data.troopAmount) sup.troops.pop();
    });
    data.support = mergeSupports(data, data.support);
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