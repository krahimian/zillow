const trulia = require('../lib/trulia')
const utils = require('../lib/utils')

trulia({
  url: process.argv[2]
}, function(err, result) {
  if (err)
    return console.log(err)

  console.log(result)

  const loan_amount = Math.floor(result.trulia_estimate * .8)

  console.log(`Loan Amount: ${loan_amount}`)

  const mortgage_payment = utils.mortgageCalculator({
    amt: loan_amount
  })

  console.log(`Mortage Payment: ${mortgage_payment}`)

  process.exit()
})
