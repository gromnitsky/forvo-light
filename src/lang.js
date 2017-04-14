'use strict';

let _names_to_codes = null
let _codes_to_names = null

// return a hash
exports.names_to_codes = function() {
    if (_names_to_codes) return _names_to_codes

    // $ curl https://apifree.forvo.com/key/XXX/format/json/action/language-list | json > lang-codes.json
    let lang_codes = require('./lang-codes')

    _names_to_codes = {}
    lang_codes.items.forEach( val => _names_to_codes[val.en] = val.code)
    return _names_to_codes
}

exports.codes_to_names = function() {
    if (_codes_to_names) return _codes_to_names

    _codes_to_names = {}
    for (let key in exports.names_to_codes()) {
	let val = exports.names_to_codes()[key]
	_codes_to_names[val] = key
    }
    return _codes_to_names
}

exports.list = function() {
    return require('./lang-codes').items
}

exports.is_valid = function(lang_code) {
    return (lang_code in exports.codes_to_names())
}
