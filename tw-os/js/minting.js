
/* TODO list
  Adjust coin calculation:
  - Bonus village perks (50% storage+market)
  - Town bonus items (25% storage+market)
  - Take resource ratio into consideration (much leem)
  - Adjust/consider coinpull interval (markets don't have 100% uptime in practice)
  - Calculate optimal spots for unused flags (towns with snobs that are consistently overflowing)

  UX:
  - Save last calculated data in localstorage
  - Move sections to panels/stepper
*/

var fieldsToStore = [
    'buildings', 
    'flag-10', 'flag-12', 'flag-14', 'flag-16', 'flag-18', 'flag-20', 'flag-22', 'flag-23', 'flag-24', 
    'flag-boost', 'noble-decree',
    'resourcepacks-1', 'resourcepacks-2', 'resourcepacks-5', 'resourcepacks-10', 'resourcepacks-15', 'resourcepacks-20', 'resourcepacks-30'
];

$(function () {
    $('#calc').on('click', () => calc());
    $('#copy-modal').on('shown.bs.modal', () => { $('#copy-modal textarea').select().focus(); });
    fieldsToStore.forEach(o => readLocalStorage(o));
});

function calc() {
    fieldsToStore.forEach(o => storeLocalStorage(o));

    var data = {};
    readBuildings(data);
    readFlags(data);
    readBoostItems(data);
    readResources(data);

    calcTotalResources(data);
    calcCoinTownsAsync(data);

    console.log(window.data = data);
}

function readBuildings(data) {
    data.towns = data.towns || [];
    var val = $('#buildings').val();
    var valJson = JSON.parse(val);

    valJson.forEach(townData => {
        var town = {};
        var coords = coordRegex.exec(townData[0]);
        town.name = townData[0].substring(0, coords.index - 1);
        town.coords = { x: +coords[1], y: +coords[2] };
        town.hasSnob = +townData[townData.length - 11] > 0;
        town.market = +townData[townData.length - 8];
        town.marketTransporters = marketLevels[town.market];
        town.storage = +townData[townData.length - 3];
        town.storageCapacity = storageLevels[town.storage];

        data.towns.push(town);
    });
}

function readFlags(data) {
    data.flags = [];
    for (var i=$('#flag-24').val(); i>0; i--) data.flags.push({ tier: 24, effect: 24 });
    for (var i=$('#flag-23').val(); i>0; i--) data.flags.push({ tier: 23, effect: 23 });
    for (var i=$('#flag-22').val(); i>0; i--) data.flags.push({ tier: 22, effect: 22 });
    for (var i=$('#flag-20').val(); i>0; i--) data.flags.push({ tier: 20, effect: 20 });
    for (var i=$('#flag-18').val(); i>0; i--) data.flags.push({ tier: 18, effect: 18 });
    for (var i=$('#flag-16').val(); i>0; i--) data.flags.push({ tier: 16, effect: 16 });
    for (var i=$('#flag-14').val(); i>0; i--) data.flags.push({ tier: 14, effect: 14 });
    for (var i=$('#flag-12').val(); i>0; i--) data.flags.push({ tier: 12, effect: 12 });
    for (var i=$('#flag-10').val(); i>0; i--) data.flags.push({ tier: 10, effect: 10 });
    for (var i=0; i<$('#flag-boost').val() && i<data.flags.length; i++) {
        data.flags[i].effect *= 2;
        data.flags[i].isBoosted = true;
    }
}

function readBoostItems(data) {
    data.nobleDecrees = $('#noble-decree').val();
}

function readResources(data) {
    data.warehousesToDump = 1 
        + ($('#resourcepacks-1').val() * 0.01)
        + ($('#resourcepacks-2').val() * 0.02)
        + ($('#resourcepacks-5').val() * 0.05)
        + ($('#resourcepacks-10').val() * 0.10)
        + ($('#resourcepacks-15').val() * 0.15)
        + ($('#resourcepacks-20').val() * 0.20)
        + ($('#resourcepacks-30').val() * 0.30);
}

function calcTotalResources(data) {
    data.totalResources = data.towns.reduce((sum, cur) => sum + (cur.storageCapacity * 3 * data.warehousesToDump), 0);
}

function calcCoinTownsAsync(data) {
    var bestPerCluster = data.bestPerCluster = {};
    var bestIter = 0;
    updateStatus('attempting1st');
    setTimeout(() => attemptCalc(0, 1, 1));
    $('#calc').prop('disabled', true);

    var attemptCalc = function (iter, max, clusterSize) {
        var centroids = kMeans(data, clusterSize);
        var scores = scoreCentroids(data, centroids);

        if (!bestPerCluster[clusterSize]) bestPerCluster[clusterSize] = { points: 0 };
        if (scores.points > bestPerCluster[clusterSize].points) {
            bestPerCluster[clusterSize] = scores;
            bestIter = iter;
            if (!data.bestCluster || scores.points > bestPerCluster[data.bestCluster].points) {
                data.shownCluster = data.bestCluster = clusterSize;
            }

            render(data);
        }

        if (++iter >= max || iter > bestIter+10) {
            clusterSize++;
            bestIter = iter = 0;
            max = 50;
            if (clusterSize > 20 || (clusterSize > 5 && 
                bestPerCluster[clusterSize-1].points < bestPerCluster[clusterSize-2].points+0.003 &&
                bestPerCluster[clusterSize-2].points < bestPerCluster[clusterSize-3].points+0.003 &&
                bestPerCluster[clusterSize-3].points < bestPerCluster[clusterSize-4].points+0.003 &&
                bestPerCluster[clusterSize-4].points < bestPerCluster[clusterSize-5].points+0.003)) {
                setTimeout(() => refineCalc(iter, max, data.bestCluster));
                updateStatus('refining', '...');
                return;
            }
        }

        updateStatus('attemptingXClusters', clusterSize, ('.'.repeat((iter % 3) + 1)));
        setTimeout(() => attemptCalc(iter, max, clusterSize));
    }

    var refineCalc = function (iter, max, clusterSize) {
        var centroids = kMeans(data, clusterSize);
        var scores = scoreCentroids(data, centroids, 10000);

        if (!bestPerCluster[clusterSize]) bestPerCluster[clusterSize] = { points: 0 };
        if (scores.points > bestPerCluster[clusterSize].points) {
            bestPerCluster[clusterSize] = scores;
            bestIter = iter;
            if (!data.bestCluster || scores.points > bestPerCluster[data.bestCluster].points) {
                data.shownCluster = data.bestCluster = clusterSize;
            }

            render(data);
        }

        if (++iter >= max) {
            updateStatus('finished', data.bestCluster);
            $('#calc').prop('disabled', false);
            return;
        }

        updateStatus('refining', ('.'.repeat((iter % 3) + 1)));
        setTimeout(() => refineCalc(iter, max, clusterSize));
    }

}

function kMeans(data, k, maxIterations = 100) {
    var centroids = data.towns.slice().sort(() => Math.random() - 0.5).slice(0, k).map(t => ({ x: t.coords.x, y: t.coords.y }));

    var townAlloc = new Array(data.towns.length).fill(-1);
    for (var iter = 0; iter < maxIterations; iter++) {
        var hasChanges = false;
        for (var i=0; i<data.towns.length; i++) {
            var best = 0, bestDist = Infinity;
            for (var c = 0; c < k; c++) {
                var dist = (data.towns[i].coords.x - centroids[c].x) ** 2 + (data.towns[i].coords.y - centroids[c].y) ** 2;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = c;
                }
            }

            if (townAlloc[i] !== best) {
                townAlloc[i] = best;
                hasChanges = true;
            }
        }

        if (!hasChanges) break;

        var sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
        for (var i=0; i<data.towns.length; i++) {
            var cluster = townAlloc[i];
            sums[cluster].x += data.towns[i].coords.x;
            sums[cluster].y += data.towns[i].coords.y;
            sums[cluster].count++;
        }

        for (var c=0; c<k; c++) {
            if (sums[c].count > 0) {
                centroids[c] = { x: sums[c].x / sums[c].count, y: sums[c].y / sums[c].count };
            }
        }
    }

    return centroids;
}

function scoreCentroids(data, centroids, maxIter = 3000) {
    var nearestTowns = centroids.map(c => {
        return data.towns
            .map(t => ({ t, dist: (t.coords.x - c.x) ** 2 + (t.coords.y - c.y) ** 2 }))
            .sort((a, b) => a.dist - b.dist)
            .map(t => t.t)
            .filter(t => t.hasSnob == true)
            .slice(0, 10);
    });

    var iter = 0, bestScore;
    while (iter++ < maxIter) {
        var towns = nearestTowns.map(o => o.slice().sort((a,b) => Math.random() - 0.5)[0]);
        var score = scoreTowns(data, towns);
        if (!bestScore || score.points > bestScore.points) {
            bestScore = score;
        }
    }

    return bestScore;
}

function scoreTowns(data, towns) {
    var clusters = towns.map(o => []);
    var hubScores = towns.map(o => 0);
    var snobScore = 0;

    for (var i=0; i<data.towns.length; i++) {
        var best = 0, bestScore = { hub: 0, snob: 0 };
        for (var t = 0; t<towns.length; t++) {
            var townScore = scoreTown(data, data.towns[i], towns[t]);
            if (townScore.hub > bestScore.hub || (townScore.hub == bestScore.hub && townScore.dist < bestScore.dist)) {
                best = t;
                bestScore = townScore;
            }
        }

        hubScores[best] += bestScore.hub;
        clusters[best].push(data.towns[i]);
        snobScore += bestScore.snob;
    }

    var sorterArray = [...Array(hubScores.length).keys()];
    sorterArray.sort((a,b) => hubScores[b] - hubScores[a]);

    clusters.sort((a,b) => sorterArray.indexOf(clusters.indexOf(a)) - sorterArray.indexOf(clusters.indexOf(b)));
    towns.sort((a,b) => sorterArray.indexOf(towns.indexOf(a)) - sorterArray.indexOf(towns.indexOf(b)));
    hubScores.sort((a,b) => sorterArray.indexOf(hubScores.indexOf(a)) - sorterArray.indexOf(hubScores.indexOf(b)));

    hubScores.forEach((_, idx) => {
        var flagEffect = idx < data.flags.length ? (1/100*(100-data.flags[idx].effect)) : 1;
        var decreeEffect = data.nobleDecrees >= 2 ? 0.9 : data.nobleDecrees == 1 ? 0.95 : 1;
        hubScores[idx] /= (coinCostTotal * flagEffect * decreeEffect);
    });
    var totalScore = hubScores.reduce((a,b) => a + b, 0);

    return { towns, clusters, hubScores, points: totalScore };
}

function scoreTown(data, town, hub) {
    var dist = Math.sqrt((hub.coords.x - town.coords.x) ** 2 + (hub.coords.y - town.coords.y) ** 2);
    var resourcesToDump = (town.storageCapacity*3) * data.warehousesToDump;
    var tripsToDump = Math.ceil(resourcesToDump / 1000 / town.marketTransporters);
    var timeToDumpFullResources = tripsToDump * dist * 2 * transportSpeed;
    
    var resourcesAtHub = resourcesToDump;
    var resourcesAtSnob = 0;
    if (timeToDumpFullResources > twoDays) {
        resourcesAtHub = resourcesToDump * (twoDays/timeToDumpFullResources);
        resourcesAtSnob = town.hasSnob ? resourcesToDump - resourcesAtHub : 0;
    }

    return { hub: resourcesAtHub, snob: resourcesAtSnob, dist: dist };
}

function render(data) {
    renderMap(data);
    renderClusterTable(data);
    renderClusterDetails(data);

    $('#results-container').show();
}

function renderMap(data) {
    var canvas = $('#map-canvas')[0];
    const ctx = canvas.getContext('2d');

    var sizes = data.towns.reduce((a, b) => {
        if (b.coords.x < a.minX) a.minX = b.coords.x;
        if (b.coords.x > a.maxX) a.maxX = b.coords.x;
        if (b.coords.y < a.minY) a.minY = b.coords.y;
        if (b.coords.y > a.maxY) a.maxY = b.coords.y;
        return a;
    }, { minX: 1000, maxX: 0, minY: 1000, maxY: 0 });
    const scale = 5;
    canvas.width = ((sizes.maxX - sizes.minX) + 10) * scale;
    canvas.height = ((sizes.maxY - sizes.minY) + 10) * scale;

    $('#map-canvas').css('width', '100%')

    // Green background
    ctx.fillStyle = 'darkgreen';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Towns
    ctx.fillStyle = 'yellow';
    data.bestPerCluster[data.shownCluster].clusters.forEach((cluster, idx) => {
        ctx.fillStyle = mapColors[idx];
        cluster.forEach(town => {
            ctx.fillRect((town.coords.x - sizes.minX + 5) * scale, (town.coords.y - sizes.minY + 5) * scale, scale, scale);
        });
    })

    // Hubs
    ctx.fillStyle = 'black';
    data.bestPerCluster[data.shownCluster].towns.forEach(town => {
        ctx.fillRect((town.coords.x - sizes.minX + 5) * scale, (town.coords.y - sizes.minY + 5) * scale, scale, scale);
    });
}

function renderClusterTable(data) {
    var tbody = $('#cluster-table tbody');
    tbody.html('');

    var maxScore = data.bestPerCluster[data.bestCluster].points;

    for (let clusterSize in data.bestPerCluster) {
        var tr = $('<tr />').appendTo(tbody);
        if (data.shownCluster == clusterSize) tr.addClass('table-primary');
        else {
            tr.on('click', () => {
                data.shownCluster = clusterSize;
                render(data);
            })
        }
        $('<td />')
            .text(clusterSize)
            .addClass('text-right')
            .appendTo(tr);

        var percentile = 1 / maxScore * data.bestPerCluster[clusterSize].points;
        var colorClass = percentile >= 0.94 ? 'text-success' : percentile >= 0.88 ? 'text-warning' : 'text-danger';
        var pointsText = Math.floor(data.bestPerCluster[clusterSize].points);
        if (pointsText >= 10000) { 
            pointsText = ''+Math.round(pointsText/100);
            pointsText = pointsText.substring(0, pointsText.length - 1) + '.' + pointsText.substring(pointsText.length - 1, pointsText.length) + 'k';
        }

        $('<td />')
            .text((Math.round(percentile * 10000) / 100) + '%')
            .addClass(colorClass)
            .appendTo(tr);

        $('<td />')
            .text(pointsText)
            .addClass(colorClass)
            .appendTo(tr);
    }
}

function renderClusterDetails(data)
{ 
    var cluster = data.bestPerCluster[data.shownCluster];
    
    var tbody = $('#cluster-details tbody');
    tbody.html('');

    for (let idx=0; idx<cluster.towns.length; idx++) {
        let town = cluster.towns[idx];
        let clusterTowns = cluster.clusters[idx];
        let flag = data.flags[idx];

        var tr = $('<tr />').appendTo(tbody);
        $('<td />')
            .html('&nbsp;')
            .css('background-color', mapColors[idx])
            .appendTo(tr);
        $('<td />')
            .append(flag ? $('<span class="icon-flag" />').addClass('flag-' + flag.tier).addClass(flag.effect > flag.tier ? 'flag-boosted' : '') : null)
            .append($('<span />').text(town.name + ' (' + town.coords.x + '|' + town.coords.y + ')'))
            .appendTo(tr);
        $('<td />')
            .append($('<div />').text(tbody.attr('data-tl-townsInCluster') + ': ' + clusterTowns.length)
                .append($('<a href="#" class="ml-2 badge badge-primary"></a>')
                    .text($('#cluster-details thead .badge').text())
                    .on('click', () => {
                        showCopyModal(clusterTowns.map(town => town.coords.x + '|' + town.coords.y).join('\r\n'));
                        return false;
                    })
                )
            )
            .append($('<div />').text(tbody.attr('data-tl-townsWithoutMaxStorage') + ': ' + clusterTowns.filter(o => o.storage < 30).length))
            .append($('<div />').text(tbody.attr('data-tl-townsWithoutMaxMarket') + ': ' + clusterTowns.filter(o => o.market < 25).length))
            .appendTo(tr);
    }
}

function updateStatus(textName, args) {
    var text = $('#status').attr('data-tl-' + textName);

    for (var i=1; i<arguments.length; i++) {
        text = text.replace(new RegExp('\\{' + (i-1) + '\\}', 'gm'), arguments[i]);
    }

    $('#status').text(text);
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

function showHubCoords() {
    showCopyModal(window.data.bestPerCluster[window.data.shownCluster].towns.map(town => town.coords.x + '|' + town.coords.y).join('\r\n'));
}

function showCopyModal(text) {
    $('#copy-modal .modal-body textarea').val(text);
    $('#copy-modal').modal();
}

function copyFromCopyModal() {
    $('#copy-modal textarea').select(); 
    document.execCommand('copy');

    var btn = $('#copy-modal .btn-primary');
    btn.text(btn.attr('data-tl-copied'));
    setTimeout(() => btn.text(btn.attr('data-tl-copy')), 5000);
}

function copyGameDataScript() {
    const element = document.getElementById('game-data-code');
    const range = document.createRange();
    range.selectNodeContents(element);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    document.execCommand('copy');

    var btn = $('#game-data-code-copy');
    btn.text(btn.attr('data-tl-copied'));
    setTimeout(() => btn.text(btn.attr('data-tl-copy')), 5000);
}

var coordRegex = /\((\d{3})\|(\d{3})\)/;
const marketLevels = [0,1,2,3,4,5,6,7,8,9,10,11,14,19,26,35,46,59,74,91,110,131,154,179,206,235];
const storageLevels = [1000,1000,1229,1512,1859,2285,2810,3454,4247,5222,6420,7893,9705,11932,14670,18037,22177,27266,33523,41217,50675,62305,76604,94184,115798,142373,175047,215219,264611,325337,400000];
const transportSpeed = 180;
const coinCostTotal = 83000;
const twoDays = 48*60*60;
const mapColors = [
    "#FFD700", // Gold
    "#FF4500", // Orange Red
    "#FF1493", // Deep Pink
    "#DB7093", // Pale Violet Red
    "#9370DB", // Medium Purple
    "#4169E1", // Royal Blue
    "#00BFFF", // Deep Sky Blue
    "#48D1CC", // Medium Turquoise
    "#ADFF2F", // Green Yellow
    "#F0E68C", // Khaki
    "#FF8C00", // Dark Orange
    "#DC143C", // Crimson
    "#FF69B4", // Hot Pink
    "#BA55D3", // Medium Orchid
    "#7B68EE", // Medium Slate Blue
    "#1E90FF", // Dodger Blue
    "#40E0D0", // Turquoise
    "#00FA9A", // Medium Spring Green
    "#FFFF54", // Soft Yellow
    "#FFE4B5",  // Moccasin
  ];