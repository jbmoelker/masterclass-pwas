const request = require('request')

module.exports = () => (req, res, next) => {
    const dpr = parseFloat(req.headers.dpr)
    const width = toInteger(req.headers.width)
    const viewportWidth = toInteger(req.headers['viewport-width'])
    const imageWidth = width || Math.round(viewportWidth * dpr)
    request(`http://via.placeholder.com/${imageWidth}x${Math.round(imageWidth/2)}?text=` + [
            `DPR: ${dpr}`,
            `W: ${width ? width : '?'}`,
            `VPW: ${viewportWidth}`
        ].join(', '))
        .pipe(res)
    
    //console.log(req.url, { dpr, width, viewportWidth })
    //next()
}

function toInteger(value) {
    const int = parseInt(value, 10)
    return isNaN(int) ? undefined : int
}