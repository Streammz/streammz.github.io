
var fieldsToStore = [
    'buildings', 
    'flag-18', 'flag-20', 'flag-22', 'flag-23', 'flag-24', 'flag-boost',
    'resourcepacks-1', 'resourcepacks-2', 'resourcepacks-5', 'resourcepacks-10', 'resourcepacks-20'
];

$(function () {
    $('#calc').on('click', () => calc());
    fieldsToStore.forEach(o => readLocalStorage(o));
});

function calc() {
    fieldsToStore.forEach(o => storeLocalStorage(o));

    var data = {};
    readBuildings(data);
    readFlags(data);
    readResources(data);

    calcCoinTowns(data);

    console.log(window.data = data);
}

function readBuildings(data) {
    data.towns = data.towns || [];
    var val = $('#buildings').val();
    var valJson = JSON.parse(val);

    valJson.forEach(townData => {
        var town = {};
        var coords = coordRegex.exec(townData[0]);
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
    for (var i=$('#flag-24').val(); i>0; i--) data.flags.push(24);
    for (var i=$('#flag-23').val(); i>0; i--) data.flags.push(23);
    for (var i=$('#flag-22').val(); i>0; i--) data.flags.push(22);
    for (var i=$('#flag-20').val(); i>0; i--) data.flags.push(20);
    for (var i=$('#flag-18').val(); i>0; i--) data.flags.push(18);
    for (var i=0; i<$('#flag-boost').val() && i<data.flags.length; i++) data.flags[i] *= 2;
}

function readResources(data) {
    data.warehousesToDump = 1 
        + ($('#resourcepacks-1').val() * 0.01)
        + ($('#resourcepacks-2').val() * 0.02)
        + ($('#resourcepacks-5').val() * 0.05)
        + ($('#resourcepacks-10').val() * 0.10)
        + ($('#resourcepacks-20').val() * 0.20);
}

function calcCoinTowns(data) {
    var best = { points: 0 };
    var bestIter = 0;
    updateStatus('Calculating with 1 cluster');
    setTimeout(() => attemptCalc(0, 1, 1));

    var attemptCalc = function (iter, max, clusterSize) {
        var centroids = kMeans(data, clusterSize);
        var scores = scoreCentroids(data, centroids);
        
        if (scores.points > best.points) {
            best = scores;
            bestIter = iter;
            data.bestTowns = best.towns;
            data.best = best;
            renderMap(data);
        }

        if (++iter >= max || iter > bestIter+10) {
            clusterSize++;
            bestIter = iter = 0;
            max = 100;
            if (clusterSize > 20) {
                updateStatus('Done calculating, most optimal should be ' + best.towns.length + ' clusters');
                return;
            }
        }

        updateStatus('Calculating with ' + clusterSize + ' clusters' + ('.'.repeat((iter % 3) + 1)));
        setTimeout(() => attemptCalc(iter, max, clusterSize));
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
            .filter(t => t.hasSnob = true)
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

    clusters.sort((a,b) => hubScores[towns.indexOf(a)] - hubScores[towns.indexOf(b)])
    towns.sort((a,b) => hubScores[towns.indexOf(a)] - hubScores[towns.indexOf(b)])
    hubScores.sort((a,b) => a - b);

    hubScores.forEach((hubScore, idx) => {
        var flagEffect = idx < data.flags.length ? (1/100*(100-data.flags[idx])) : 1;
        hubScores[idx] /= (coinCostTotal * flagEffect);
    });
    var totalScore = hubScores.reduce((a,b) => a + b, 0);

    return { towns, clusters, points: totalScore };
}

const twoDays = 48*60*60;
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

function renderMap(data) {
    var canvas = $('#canvas')[0];
    const ctx = canvas.getContext('2d');

    var sizes = data.towns.reduce((a, b) => {
        if (b.coords.x < a.minX) a.minX = b.coords.x;
        if (b.coords.x > a.maxX) a.maxX = b.coords.x;
        if (b.coords.y < a.minY) a.minY = b.coords.y;
        if (b.coords.y > a.maxY) a.maxY = b.coords.y;
        return a;
    }, { minX: 1000, maxX: 0, minY: 1000, maxY: 0 });
    var scale = 4;
    canvas.width = ((sizes.maxX - sizes.minX) + 10) * scale;
    canvas.height = ((sizes.maxY - sizes.minY) + 10) * scale;

    // Black background
    ctx.fillStyle = 'darkgreen';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Towns
    ctx.fillStyle = 'yellow';
    data.best.clusters.forEach((cluster, idx) => {
        ctx.fillStyle = mapColors[idx];
        cluster.forEach(town => {
            ctx.fillRect((town.coords.x - sizes.minX + 5) * scale, (town.coords.y - sizes.minY + 5) * scale, scale, scale);
        });
    })

    // Centroids
    ctx.fillStyle = 'black';
    data.best.towns.forEach(town => {
        ctx.fillRect((town.coords.x - sizes.minX + 5) * scale, (town.coords.y - sizes.minY + 5) * scale, scale, scale);
    });
}

function updateStatus(text) {
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
var coordRegex = /\((\d{3})\|(\d{3})\)/;


const marketLevels = [0,1,2,3,4,5,6,7,8,9,10,11,14,19,26,35,46,59,74,91,110,131,154,179,206,235];
const storageLevels = [1000,1000,1229,1512,1859,2285,2810,3454,4247,5222,6420,7893,9705,11932,14670,18037,22177,27266,33523,41217,50675,62305,76604,94184,115798,142373,175047,215219,264611,325337,400000];
const transportSpeed = 180;
const coinCostTotal = 83000;
const mapColors = [
    "#FFD700", // Gold
    "#FF8C00", // Dark Orange
    "#FF4500", // Orange Red
    "#DC143C", // Crimson
    "#FF1493", // Deep Pink
    "#FF69B4", // Hot Pink
    "#DB7093", // Pale Violet Red
    "#BA55D3", // Medium Orchid
    "#9370DB", // Medium Purple
    "#7B68EE", // Medium Slate Blue
    "#4169E1", // Royal Blue
    "#1E90FF", // Dodger Blue
    "#00BFFF", // Deep Sky Blue
    "#40E0D0", // Turquoise
    "#48D1CC", // Medium Turquoise
    "#00FA9A", // Medium Spring Green
    "#ADFF2F", // Green Yellow
    "#FFFF54", // Soft Yellow
    "#F0E68C", // Khaki
    "#FFE4B5"  // Moccasin
  ];