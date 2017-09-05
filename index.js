const cheerio = require('cheerio')
const async = require('async')
const querystring = require('querystring')
const request = require('request')
const merge = require('merge-deep')

const req = request.defaults({
  jar: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
  }
})

const buildParameters = function(options) {
  const defaults = {
    price: {
      min: '',
      max: '150000'
    },
    lot: {
      min: '2178000',
      max: ''
    },
    rect: '',
    rid: '',
    crid: '',
    selrect: ''
  }

  const opts = merge(defaults, options)

  return {
    spt: 'homes',
    status: 110001,
    lt: 111101,
    ht: 000010,
    pr: opts.price.min + ',' + opts.price.max,
    mp: ',555',
    bd: '0,',
    ba: '0,',
    sf: ',',
    lot: opts.lot.min + ',' + opts.lot.max,
    yr: ',',
    singlestory: 0,
    hoa: 0,
    pho: 0,
    pets: 0,
    parking: 0,
    laundry: 0,
    'income-restricted': 0,
    pnd: 0,
    red: 0,
    zso: 0,
    days: 'any',
    ds: 'all',
    pmf: 1,
    pf: 1,
    sch: 100111,
    rect: opts.rect,
    p: 1,
    sort: 'days',
    search: 'maplist',
    disp: 1,
    rid: opts.rid,
    crid: opts.crid,
    selrect: opts.selrect,
    listright: true,
    zoom: 6
  }
}

const search = function(options, cb) {
  options = options || {}
  
  const parameters = buildParameters(options)
  const base = 'https://www.zillow.com/search/GetResults.htm?'
  const url = `${base}${querystring.stringify(parameters)}`

  req({
    url: url,
    method: 'POST',
    form: {
      clipPolygon: options.clipPolygon,
      isMapSearch: 1,
      zoom: 6
    },
    json: true
  }, function(err, res, data) {
    if (err)
      return cb(err)

    const $ = cheerio.load(data.list.listHTML)

    let results = []

    $('li article').each(function(i, elem) {
      const zpid = $(this).data('zpid')
      const latitude = $(this).data('latitude')
      const longitude = $(this).data('longitude')
      const price = $(this).find('.zsg-photo-card-price').text()
      const info = $(this).find('.zsg-photo-card-info').text()
      const address = $(this).find('.zsg-photo-card-address').text()
      const broker = $(this).find('.zsg-photo-card-broker-name').text()
      const link = $(this).find('a.zsg-photo-card-overlay-link').attr('href')
      const image = $(this).find('.zsg-photo-card-img img').data('src')

      results.push({
	zpid: zpid,
	latitude: latitude,
	longitude: longitude,
	price: price,
	info: info,
	address: address,
	link: `https://zillow.com${link}`,
	broker: broker,
	image: image
      })
    })

    cb(null, results)
  })
}

const get_listing = function(url, cb) {
  req({
    url: url,
    json: true
  }, function(err, res, json) {
    if (err)
      return cb(err)

    let $ = cheerio.load(json.html)
    let listing = $('.zsg-content-item').text().trim()

    cb(null, listing)
  })
}

const get_tax_history = function(url, cb) {
  req({
    url: url,
    json: true
  }, function(err, res, json) {
    if (err)
      return cb(err)

    let tax_history = []
    const $ = cheerio.load(json.html)

    $('tbody tr').each(function(i, elem) {
      tax_history.push({
	year: $(this).children().eq(0).text(),
	property_taxes: $(this).children().eq(1).text(),
	property_taxes_change: $(this).children().eq(2).text(),
	tax_assessment: $(this).children().eq(3).text(),
	tax_asessment_change: $(this).children().eq(4).text()
      })
    })

    cb(null, tax_history)
  })
}

const get_price_history = function(url, cb) {
  req({
    url: url,
    json: true
  }, function(err, res, json) {
    if (err)
      return cb(err)

    let price_history = []
    const $ = cheerio.load(json.html)

    $('tbody tr').each(function(i, elem) {
      price_history.push({
	date: $(this).children().eq(0).text(),
	event: $(this).children().eq(1).text(),
	price: $(this).children().eq(2).text(),
	price_sqft: $(this).children().eq(3).text(),
	source: $(this).children().eq(4).text()
      })
    })

    cb(null, price_history)    
  })
}

const info = function(zpid, cb) {

  const url = `https://zillow.com/homedetails/${zpid}_zpid`

  req({
    url: url,
    q: {
      fullpage: true
    }
  }, function(err, res, html) {
    if (err)
      return cb(err)

    const $ = cheerio.load(html)

    let result = {
      zpid: zpid,
      url: url,
      price_history: [],
      tax_history: [],
      facts: {}
    }

    result.description = $('.zsg-content-component div.zsg-content-item').text()
    result.listing = $('#listing-provided-by-module').text()

    let seed = 0
    $('.hdp-fact-list li').each(function(i, elem) {
      let key = $(this).find('.hdp-fact-name').text()
      const value = $(this).find('.hdp-fact-value').text()

      if (!key) {
	key = `fact${seed}`
	seed++
      }

      key = key.replace(':', '')
      key = key.replace('#', '')
      key = key.trim()
      key = key.toLowerCase()
      key = key.replace(/\s/g, '_')

      result.facts[key] = value
    })

    const price_re = /ajaxURL:\"([^\"]+)\",[^{}]*,jsModule:\"z-hdp-price-history\"/gi
    const price_result = price_re.exec(html)
    const price_url = `https://zillow.com${price_result[1]}`

    const tax_re = /ajaxURL:\"([^\"]+)\",[^{}]*,divId:\"hdp-tax-history\"/gi
    const tax_result = tax_re.exec(html)
    const tax_url = `https://zillow.com${tax_result[1]}`

    const listing_re = /ajaxURL:\"([^\"]+)\",[^{}]*,divId:\"listing-provided-by-module\"/gi
    const listing_result = listing_re.exec(html)
    const listing_url = `https://zillow.com${listing_result[1]}`
    
    async.parallel({
      price_history: get_price_history.bind(null, price_url),
      tax_history: get_tax_history.bind(null, tax_url),
      listing: get_listing.bind(null, listing_url)
    }, function(err, results) {
      if (err)
	return cb(err)

      Object.assign(result, results)
      
      cb(null, result)
    })
  })
}


module.exports = {
  search: search,
  info: info
}

if (!module.parent) {
  /* let zpid = 2093138889
   * info(zpid, function(err, info) {
   *   if (err)
   *     console.log(err)

   *   console.log(info)
   * })*/
}
