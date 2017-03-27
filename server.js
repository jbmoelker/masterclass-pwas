const express = require('express');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');
const revConfig = require('./lib/rev-config');
const revUrl = require('./lib/rev-url');
const shrinkRay = require('shrink-ray');
const urlParser = require('url');

const app = express();
const config = {
    baseDir: 'src/',
    cacheDir: 'cache/',
    port: process.env.PORT || 7924
};

/**
 * Pretty URLs:
 * - redirect URLs with pattern `path/to/page/index.html` to `path/to/page/` and maintain search parameters (`?param=value` etc)
 */
app.use('*/index.html', (req, res) => res.redirect(301, `${path.dirname(req.originalUrl)}/${urlParser.parse(req.originalUrl).search}`));

/**
 * Performance tuning for entire app:
 * - Enable validating cached responses using `etag`s: https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#validating_cached_responses_with_etags
 * - Remove unneeded headers ('X-Powered-By', 'lastMofied') to safe bytes
 * - Set immutable headers on revisioned files with `revConfig.pattern`: https://bitsup.blogspot.nl/2016/05/cache-control-immutable.html
 * - Enable dynamic gzip and Brotli compression using Shrink-ray: https://github.com/aickin/shrink-ray
 * - Serve (revisioned) files from `cacheDir` when available.
 */
app.set('etag', true);
app.use((req, res, next) => { res.removeHeader('X-Powered-By'); next(); });
app.use(revConfig.pattern, (req, res, next) => { res.setHeader('Cache-Control', 'max-age=365000000, immutable'); next(); });
app.use(shrinkRay());
app.use(express.static(path.join(__dirname, config.cacheDir), { index: false, lastModified: false }));

/**
 * Static files:
 * - Try source files from `baseDir`.
 * - Don't try to use `index.html` in case URL is a directory as we render pages dynamically.
 */
app.use(express.static(path.join(__dirname, config.baseDir), { index: false, lastModified: false }));

/**
 * Dynamic pages:
 * - Uses Nunjucks for dynamic rendering: https://mozilla.github.io/nunjucks/api.html#express
 * - Adds a `revUrl` helper to inject URLs to revisioned files.
 * - Render page if there's a matching template (`index.html`) for the URL.
 * - Return 500 page if something goes wrong while rendering.
 * - Return 404 page if no matching template is found.
 */
const renderer = nunjucks.configure(config.baseDir, {
    autoescape: true,
    express: app,
    watch: true
});
renderer.addGlobal('revUrl', revUrl);

app.get('*', (req, res, next) => {
    const filename = path.join(req.path, 'index.html');
    console.log(`${config.baseDir}${filename}`);
    fs.stat(`${config.baseDir}${filename}`, (err, stats) => {
        if (err || !stats.isFile()) {
            next();
        } else {
            res.render(`./${filename}`, {}, (err, html) => {
                if (err) {
                    res.status(500).send('Internal Server Error')
                }
                res.send(html);
            });
        }
    });
});

app.get('*', (req, res, next) => {
    if (req.headers['accept'].includes('text/html')) {
        res.status(404).render('./404.html');
    } else {
        next();
    }
});


app.listen(config.port, (err) => {
    err ? console.error(err) : console.log(`app running on http://localhost:${config.port}`);
});
