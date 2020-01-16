const Web3 = require('web3'),
      mainnet = process.env.Provider,
      w3 = new Web3(new Web3.providers.HttpProvider(mainnet))

exports.convertToCoin = function(coinType , value) {
	var result = ''
	switch(coinType) {
	case 'btc':
		result = String(parseFloat(value) / 100000000)
	case 'eth':
		result = w3.utils.fromWei(value, 'ether')
	case '':
		result = String(parseFloat(value) / 100000000)
	}

	return result
}