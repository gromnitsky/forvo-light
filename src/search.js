'use strict';

let URLSearchParams = require('url-search-params')

let lang = require('./lang')

let isnum = function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

let pad = function(str) {
    return ('0'+str).slice(-2)
}

let ispobj = function(o) {
    return (o === Object(o)) && !(o instanceof Array)
}

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
	url += '/popular-pronounced-words/limit/100'
	break
    default:
	if (!query.q) return null
	url += `/pronounced-words-search/search/${encodeURIComponent(query.q)}`
    }

    if (lang_code && lang_code !== '-') url += `/language/${lang_code}`
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

class QueryCounter {
    constructor(apikey, reset_hour = 22) {
	if (!apikey) throw new Error('no apikey')
	this.apikey = apikey
	this.db = {}
	this.db_name = 'forvo-light-query-counter'
	this.reset_hour = reset_hour
	this.load()
    }

    deadline(localtime) {
	localtime = localtime || new Date()
	let midnight = Date.UTC(localtime.getUTCFullYear(),
				localtime.getUTCMonth(), localtime.getUTCDate())
	if (localtime.getUTCHours() >= this.reset_hour)
	    midnight += 60*60*24*1000
	return midnight + 60*60*this.reset_hour*1000
    }

    refresh(localtime, init_counter, fn) {
	let prev = this.get()
	let reset = () => {
	    this.db[this.apikey] = {
		counter: init_counter || 0,
		deadline: this.deadline(localtime)
	    }
	}

	if (!(prev && prev[this.apikey])) {
	    reset()
	    this.save()
	    return
	}

	if (prev[this.apikey].deadline === this.deadline(localtime)) {
	    if (fn) fn(prev[this.apikey].counter)
	} else
	    reset()

	this.save()
    }

    inc(localtime) {
	this.refresh(localtime, 1, (prev) => {
	    this.db[this.apikey] = {
		counter: prev + 1,
		deadline: this.deadline(localtime)
	    }
	})
    }

    deadline_pretty() {
	let d = new Date(this.deadline())
	return `${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    toString() {
	this.refresh()
	return this.db[this.apikey].counter
    }

    save() {
	localStorage.setItem(this.db_name, JSON.stringify(this.db))
    }

    get() {
	let json
	try {
	    json = JSON.parse(localStorage.getItem(this.db_name))
	} catch (e) {
	    return
	}
	return (ispobj(json)) ? json : null
    }

    load() {
	let json = this.get()
	if (json) this.db = json
    }
}

exports.QueryCounter = QueryCounter
