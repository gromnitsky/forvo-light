'use strict';

let lang = require('./lang')

exports.parse_query = function(str = '') {
    let m = str.match(/^(\.\S+|\.)?(.*)/)
    let [t, q] = m.slice(1,3)

    let type
    switch (t) {
    case '.':
	// all possible pronunciations for 1 particular word
	type = 'word-pronunciations'
	break
    case '.wp':
	type = 'word-pronunciations'
	break
    case '.top20':
	type = 'top20'
	break
    default:
	// a number of pronunciations for a matched string w/ 1
	// top-rated pronunciation for each result
	type = 'pronounced-words-search'
    }

    q = (q || '').replace(/\s+/g, ' ').trim()

    return { type, q }
}

// query -- a result from parse_query()
exports.req_url = function(apikey, query, lang_code) {
    if (!query || !apikey) return null
    if (lang_code && !lang.is_valid(lang_code)) return null

    let url = `https://apifree.forvo.com/key/${apikey}/format/json/action`

    switch (query.type) {
    case 'word-pronunciations':
	url += `/word-pronunciations/word/${encodeURIComponent(query.q)}`
	break
    case 'top20':
	url += '/popular-pronounced-words/limit/20'
	break
    default:
	url += `/pronounced-words-search/search/${encodeURIComponent(query.q)}`
    }

    if (lang_code) url += `/language/${lang_code}`
    return url
}
