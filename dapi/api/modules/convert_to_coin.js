exports.convertToCoin = function(coinType , value) {
	let result = 0
	switch(coinType) {
	case "btc":
		result = parseFloat(value) / 100000000
	case "eth":
		result = parseFloat(value) / 1000000000000000000
	case "":
		result = parseFloat(value) / 100000000
	}

	return result
}