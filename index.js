// Deps
const fs = require('fs');
const fetch = require('node-fetch');

// Speedrun.com has an API usage cap of 100/minute. We'll set to 80 to be extra safe.
const requestsPerMinute = 80;

// SRC Urls to grab relevant data.
// Feel free to update urls.runs to sort and filter based on their API docs:
// https://github.com/speedruncomorg/api/blob/master/version1/runs.md#get-runs
const urls = {
    runs: 'https://www.speedrun.com/api/v1/runs?game=o1y9j9v6&orderby=submitted&direction=desc',
    categories: 'https://www.speedrun.com/api/v1/games/o1y9j9v6/categories',
    levels: 'https://www.speedrun.com/api/v1/games/o1y9j9v6/levels',
    variables: 'https://www.speedrun.com/api/v1/games/o1y9j9v6/variables'
};

// Func to fetch JSON data.
async function getJson(url) {
    const request = await fetch(url);
    return await request.json();
}

// Func to provide a promise resolve after a timeout.
function delay() {
    return new Promise((resolve) => {
        setTimeout(resolve, (60 / requestsPerMinute) * 1000);
    });
}

// Speedrun.com paginates data - So to iterate through all the data
// This iterable generator function will yield out a page of data and prepare the next
// based on the responses pagination metadata.
async function* getJsonPaginator(url) {
    let hasNextPage;

    while (url) {
        const res = await getJson(url);
        url = null;

        if (res.pagination !== undefined) {
            const nextPage = res.pagination.links.find((link) => link.rel === 'next');
            if (nextPage) {
                url = nextPage.uri;
            }
        }

        yield res.data;

        await delay();
    }
}

// Main script IIFE
(async function() {
    // Details and maps for variables and such
    const categories = {};
    (await getJson(urls.categories)).data.forEach((cat) => (categories[cat.id] = cat.name));

    const levels = {};
    (await getJson(urls.levels)).data.forEach((level) => (levels[level.id] = level.name));

    const variables = {};
    (await getJson(urls.variables)).data.forEach((variable) => (variables[variable.id] = variable));

    // Make the pagination iterator for the runs api
    const paginator = getJsonPaginator(urls.runs);

    // Track what iteration we're on for JSON file formatting purposes...
    let i = 0;

    // Prepare to fill an array with run data objects
    fs.writeFileSync('celeste.json', '[\n');

    for await (let page of paginator) {
        // Transform the returned run data to cut it down + see if runs are legit
        // Filter out any runs that seem to be legit
        const runsMap = page
            .map(({ date, weblink, category, status, times, level, values }) => {
                let mappedValues = {};
                for (const variableId in values) {
                    if (values.hasOwnProperty(variableId)) {
                        try {
                            const variable = variables[variableId];
                            mappedValues[variable.name] = variable.values.values[values[variableId]].label;
                        } catch (err) {}
                    }
                }

                let timeDivision = 'no primary_t time';
                let timeModulus = 'no primary_t time';

                if (times.primary_t !== undefined) {
                    timeDivision = (times.primary_t * 1000) / (0.017 * 1000);
                    timeModulus = (times.primary_t * 1000) % (0.017 * 1000);
                }

                return {
                    ...mappedValues,
                    date,
                    weblink,
                    categoryName: categories[category],
                    levelName: levels[level],
                    status,
                    times,
                    ['(times.primary_t * 1000) / 17']: timeDivision,
                    ['(times.primary_t * 1000) % 17']: timeModulus
                };
            })
            .filter((run) => {
                return run['(times.primary_t * 1000) % 17'] !== 0;
            });

        if (runsMap.length) {
            // Appends a comma, followed by an unwrapped array of runs that don't meet criteria.
            fs.appendFileSync(
                'celeste.json',
                (i++ !== 0 ? ',\n  ' : '') +
                    JSON.stringify(runsMap, null, 2)
                        .replace(/(^\[|\]$)/g, '')
                        .trim()
            );
        }
    }

    // Close out the JSON file with an array ending bracket.
    fs.appendFileSync('celeste.json', '\n]');
})();
