'use strict';

let URLSearchParams = require('url-search-params')

let lang = require('./lang')

exports.query_parse = function(str = '') {
    str = str.trim()
    if (str.length === 0) return { type: '.pws', q: '' }

    let parts = str.split(/\s+/)
    if (parts[0][0] !== '.') return { type: '.pws', q: parts.join(' ') }

    let cmd = {
	'.pws': '.pws',		// pronounced-words-search
	'.wp': '.wp',		// word-pronunciations
	'.': '.wp',		// an alias for word-pronunciations
	'.top': '.top'
    }
    let type = cmd[parts[0]]
    if (!type) type = '.pws'
    return {type, q: parts.slice(1).join(' ') }
}

exports.query_restore = function(query) {
    if (!query) return ""
    let type = {
	'.pws': '',
	'.wp': '.',
	'.top': '.top'
    }
    if (!(query.type in type))
	throw new Error(`invalid query type: ${query.type}`)
    return (type[query.type] + ' ' + query.q).trim()
}

exports.forvo = {
    protocol: 'https',
    host: 'apifree.forvo.com',
    port: 80
}

// query -- a result from query_parse()
exports.req_url = function(apikey, query, lang_code) {
    if (!query || !apikey) return null
    if (lang_code && lang_code !== '-' && !lang.is_valid(lang_code)) return null

    let url = `${exports.forvo.protocol}://${exports.forvo.host}${exports.forvo.port === 80 ? "" : ":"+exports.forvo.port}/key/${apikey}/format/json/action`

    switch (query.type) {
    case '.wp':
	if (!query.q) return null
	url += `/word-pronunciations/word/${encodeURIComponent(query.q)}`
	break
    case '.top':
	url += '/popular-pronounced-words/limit/20'
	break
    default:
	if (!query.q) return null
	url += `/pronounced-words-search/search/${encodeURIComponent(query.q)}`
    }

    if (lang_code) url += `/language/${lang_code}`
    return url
}

class History {
    constructor(maxlen = 32) {
	if (maxlen < 1) throw new Error('maxlen param must be >= 1')
	this.maxlen = maxlen
	this._arr = []
    }

    add(elm) {
	let idx = this._arr.indexOf(elm)
	if (idx === -1) {
	    if (this._arr.length >= this.maxlen) this._arr.pop()
	} else {
	    this._arr.splice(idx, 1)
	}

	this._arr.unshift(elm)
	this.save()
	return this
    }

    save() {
	localStorage.setItem('forvo-light-history', JSON.stringify(this._arr))
    }

    load() {
	let json
	try {
	    json = JSON.parse(localStorage.getItem('forvo-light-history'))
	} catch (e) {
	    return
	}
	if (json instanceof Array) this._arr = json
    }

    [Symbol.iterator]() {
	return this._arr[Symbol.iterator]()
    }

    toString() {
	return this._arr.toString()
    }
}

exports.History = History

// url_hash -- a string like '#/foo/bar?q=1&w=2'
exports.URLSearchParams = function(url_hash) {
    let p = url_hash.split('?')
    if (p.length === 1) return new URLSearchParams("")
    return new URLSearchParams(p[1])
}
