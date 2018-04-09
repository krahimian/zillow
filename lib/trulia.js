const request = require('request')
const cheerio = require('cheerio')

const utils = require('./utils')

const req = request.defaults({
  jar: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
  }
})
  

const index = function(opts, cb) {

  const url = opts.url

  // search by id
  // search by address  

  req({
    url: url
  }, function(err, res, html) {
    if (err)
      return cb(err)

    const $ = cheerio.load(html)

    let result = {}

    const trulia_estimate = utils.cleanPrice($('#propertySummary [data-role="price"]').contents().get(0).data)
    result.trulia_estimate = trulia_estimate

    // get mortgage rates
    // get property taxes
    // get hoa
    // get other

    // get parcel info    

    cb(null, result)
  })

}

module.exports = index
