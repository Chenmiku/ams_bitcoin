exports.convertToCoin = function(coinType , value) {
	let result = 0
	switch(coinType) {
	case 'btc':
		result = parseFloat(value) / 100000000
	case 'eth':
		result = parseFloat(value) / 1000000000000000000n
	case '':
		result = parseFloat(value) / 100000000
	}

	return result
}