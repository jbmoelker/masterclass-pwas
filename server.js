const cacheControlImmutable = require('./lib/cache-control-immutable');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const http = require('http');
const http2 = require('http2');
const nunjucks = require('nunjucks');
const path = require('path');
const resPushAssets = require('./lib/res-push-assets');
const revConfig = require('./lib/rev-config');
const revUrl = require('./lib/rev-url');
const shrinkRay = require('shrink-ray');
const spdy = require('spdy');
const urlParser = require('url');

const app = express();
const config = {
    baseDir: 'src/',
    cacheDir: 'cache/',
    port: process.env.PORT || 7924,
    ssl: {
        key: fs.readFileSync(`${__dirname}/config/localhost.key`),
        cert: fs.readFileSync(`${__dirname}/config/localhost.crt`),
    }
};
const serverH1 = http.createServer(app);
const serverH2 = http2.createSecureServer(config.ssl, app);
const serverSpdy = spdy.createServer(config.ssl, app);

/**
 * Pretty URLs:
 * - redirect URLs with pattern `path/to/page/index.html` to `path/to/page/` and maintain search parameters (`?param=value` etc)
 */
app.use('*/index.html', (req, res) => res.redirect(301, `${path.dirname(req.originalUrl)}/${urlParser.parse(req.originalUrl).search}`));

/**
 * Performance tuning for entire app:
 * - Enable validating cached responses using `etag`s: https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#validating_cached_responses_with_etags
 * - Remove unneeded headers ('X-Powered-By' (done by Helmet), 'lastMofied') to safe bytes
 * - Set immutable headers on revisioned files with `revConfig.pattern`: https://bitsup.blogspot.nl/2016/05/cache-control-immutable.html
 * - Enable dynamic gzip and Brotli compression using Shrink-ray: https://github.com/aickin/shrink-ray
 * - Serve (revisioned) files from `cacheDir` when available.
 */
app.set('etag', true);
app.use(helmet());
app.use(revConfig.pattern, cacheControlImmutable);
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
                // const pushStream = res.push(url, { request: { accept: '*/*' }, response: { 'content-type': 'text/css' } });
                // pushStream.end('body { background: red !important; }')
                resPushAssets(res, html);
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


serverH1.listen(config.port, (err) => {
    err ? console.error(err) : console.log(`App served over HTTP/1 on http://localhost:${config.port}`);
});
serverH2.listen(config.port + 1, (err) => {
    err ? console.error(err) : console.log(`App served over HTTP/2 on https://localhost:${config.port + 1}`);
});
serverSpdy.listen(config.port + 2, (err) => {
    err ? console.error(err) : console.log(`App served over SPDY/H2 on https://localhost:${config.port + 2}`);
});