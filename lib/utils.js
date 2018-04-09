const cleanPrice = function(price) {

  price = price.replace(/\s/g,'')
  price = price.replace('$','').replace(',','')  

  return parseInt(price, 10)

}

const mortgageCalculator = function(opts) {

  if (!opts.amt)
    return null

  const term = opts.term || (30 * 12)
  const apr = (opts.apr || 0.04195) / 12
  const payment = opts.amt*(apr * Math.pow((1 + apr), term))/(Math.pow((1 + apr), term) - 1)

  return payment

}

module.exports = {
  cleanPrice: cleanPrice,
  mortgageCalculator: mortgageCalculator
}
