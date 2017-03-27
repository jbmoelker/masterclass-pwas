# Masterclass Progressive Web Apps

## Project setup

This project serves an adapted version of the [Bootstrap documentation website](http://getbootstrap.com/).
It is based on the [github pages branche of Bootstrap](https://github.com/twbs/bootstrap/tree/gh-pages). 

Differences from actual Bootstrap documentation:

* Added a custom web font.
* Removed third party scripts.
* The `src/` directory is served with [Express](https://expressjs.com/).
* Templating is done with [Nunjucks](https://mozilla.github.io/nunjucks/).


## Quick start

This project requires [Node.js](http://nodejs.org/) and [npm](https://npmjs.org/).

After installing dependencies using `npm install` the following scripts are available on all exercise branches:

`npm run ...` | Description
---|---
`build` | Revisions and writes static files from `src/` to `cache/`.
`start` | Starts an [Express.js](http://expressjs.com/) server on `http://localhost:7924` (7924 is "PWAS" in T9).

More (sub) tasks are available in [package.json > scripts](package.json).


## Exercises

* 01 - Add manifest
* 02 - Register Service Worker
* 03 - Hijack Fetch
* 04 - Skip Waiting
* 05 - Create Offline Page
* 06 - Cache Offline Page
* 07 - Use Offline Page
* 08 - Precache Assets
* 09 - Use Cached Assets
* 10 - Cache Fetched Pages
* 11 - Use Cached Pages

Solutions are linked from each individual exercise.
