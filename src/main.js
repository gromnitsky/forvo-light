'use strict';

require("babel-polyfill")
let Mustache = require('mustache')
let jsonp = require('jsonp')
let firstBy = require('thenby')

let meta = require('../package.json')
let lang = require('./lang')
let search = require('./search')

class NavService {
    constructor(selector) {
	this.anchors = document.querySelectorAll(selector)
	// make NodeList a decent fellow
	this.anchors[Symbol.iterator] = Array.prototype[Symbol.iterator]
    }

    // propagate all the current hash query string opts to all the nav
    // elements
    update() {
	let usp = new search.URLSearchParams(location.hash)
	for (let node of this.anchors) {
	    let params = new search.URLSearchParams(node.hash)
	    usp.set('m', params.get('m'))
	    node.href = '#?' + usp.toString()
	}
    }
}

class Page {
    constructor(container_id, template_id) {
	this.container = document.querySelector(container_id)
	this.template_id = template_id
	this.template = document.querySelector(template_id)
	this.nav = new NavService('#nav a')
    }

    $(str) {
	let nodes = this.container.querySelectorAll(str)
	return nodes.length === 1 ? nodes[0] : nodes
    }

    attach(selector, event, fn) {
	let node = this.$(selector)
	if (node instanceof NodeList) {
	    for (let idx = 0; idx < node.length; ++idx) {
		let el = node[idx]
		el.addEventListener(event, (evt) => fn.call(this, evt, el))
	    }
	} else {
	    node.addEventListener(event, (evt) => fn.call(this, evt, node))
	}
    }

    hyperlink(pairs = {}) {
	let ls = this.lsearch()
	for (let key in pairs) ls.set(key, pairs[key])
	return `${location.pathname}#?${ls}`
    }

    lsearch() {
	return new search.URLSearchParams(location.hash)
    }

    render() {
	log(this.constructor.name, 'render()')
	if (this.error) {
	    this.container.innerHTML = this.error
	    return
	}

	let id = this.template_id.replace(/^#tmpl_/, '')
	this.container.innerHTML = Mustache.render(`<div id=${id}>` + this.template.innerHTML + '</div>', this)
	if (this.post_render) this.post_render()
    }
}

class PageAbout extends Page {
    constructor(container) {
	super(container, '#tmpl_about')
	this.meta = meta
    }

    post_render() {
	this.attach('a[class="external"]', 'click', this.open_in_browser)
    }

    open_in_browser(evt, node) {
	evt.preventDefault()
	window.open(node.href, '_system')
    }
}

class PagePreferences extends Page {
    constructor(container) {
	super(container, '#tmpl_preferences')
	this._opts = ['apikey', 'langlist', 'server']
	for (let name of this._opts)
	    this[name] = localStorage.getItem(`forvo-light-${name}`)
	this.debug = conf.debug
	if (this.apikey) this.qc = new search.QueryCounter(this.apikey)
    }

    post_render() {
	this.attach('form', 'submit', this.save)
    }

    save(event) {
	event.preventDefault()

	let btn = this.$('button')
	btn.disabled = true

	for (let name of this._opts) {
	    let el = this.$(`#preferences__${name}`)
	    if (!el) continue
	    localStorage.setItem(`forvo-light-${name}`, el.value)
	}

	setTimeout( () => {
	    btn.disabled = false
	}, 500)
    }
}

class PageHistory extends Page {
    constructor(container) {
	super(container, '#tmpl_history')

	let hist = new search.History()
	hist.load()
	this.history = []
	for (let item of hist)
	    this.history.push({
		item,
		link: this.hyperlink({
		    'q': item,
		    'm': 'search'
		})
	    })
    }
}

class PageSearch extends Page {
    constructor(container) {
	super(container, '#tmpl_search')
	this.langlist = lang.list()
	this.history = new search.History()
	this.history.load()
    }

    post_render() {
	this.attach('form', 'submit', this.submit)

	this.$('form select').value = this.lsearch().get('l') || "-"

	// auto-submit the form
	let form_input = this.$('form input')
	form_input.value = this.lsearch().get('q')
	if (form_input.value.trim()) this.$('form button').click()
    }

    output(html) {
	this.$('#search__output').innerHTML = html
    }

    server_opt_set() {
	if (!conf.debug) return true

	let opt = localStorage.getItem('forvo-light-server')
	if (!opt) return false

	opt = opt.trim().split(/\s+/)
	search.forvo = {
	    protocol: opt[0],
	    host: opt[1],
	    port: opt[2]
	}
	return true
    }

    submit(event) {
	event.preventDefault()

	let apikey = localStorage.getItem('forvo-light-apikey')
	let langlist = localStorage.getItem('forvo-light-langlist')
	if (!apikey) {
	    this.output('No API key')
	    return
	}
	let qc = new search.QueryCounter(apikey)

	if (!this.server_opt_set()) {
	    this.output('Debug mode requires <i>Server options</i>')
	    return
	}

	let query = search.query_parse(this.$('form input').value)
	let lang = this.$('form select').value
	let url = search.req_url(apikey, query, lang)
	if (!url) {
	    this.output('Incomplete query')
	    return
	}

	if (!conf.is_online()) {
	    this.output('The device is offline')
	    return
	}

	// show a spinner
	this.output('<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>')
	// disable the button
	let button = this.$('form button')
	button.disabled = true

	log(`jsonp URL ${url}`)
	jsonp(url, {timeout: 15000}, (err, data) => {
	    button.disabled = false
	    if (err) {
		this.output(`<code>${search.forvo.protocol}://${search.forvo.host}:${search.forvo.port}</code> ${err}`)
		return
	    }
	    log('jsonp result', data)
	    try {
		this.validate_response(data)
	    } catch (err) {
		this.output(err)
		return
	    }

	    qc.inc()
	    this.history.add(search.query_restore(query))
	    this.url_update(query, lang)

	    let widget
	    switch (query.type) {
	    case '.wp':
		widget = new ForvoPronouncedWordsSearch('#search__output',
							data, { langlist })
		break
	    case '.top':
		widget = new ForvoPopularPronouncedWords('#search__output', data)
		break
	    default:
		// pronounced-words-search
		widget = new ForvoPronouncedWordsSearch('#search__output',
							data, { langlist })
	    }
	    widget.render()
	})
    }

    url_update(query, lang) {
	// FIXME: do a push instead but check if the prev state !== the cur
	window.history.replaceState({}, '', this.hyperlink({
	    'q': search.query_restore(query),
	    'l': lang
	}))
	this.nav.update()
    }

    validate_response(json) {
	if (!json || json === {}) throw new Error('Empty response')
	if (json instanceof Array) throw new Error(`Forvo API: ${json}`)
    }
}

// handles both .wp & .pws
class ForvoPronouncedWordsSearch extends Page {
    constructor(container, data, opt) {
	super(container, '#tmpl_forvo_pronounced-words-search')
	if (!data || !data.items || !data.items.length) {
	    this.error = 'Not found'
	    return
	}
	this.opt = opt || {}
	this.data = data

	let apikey = localStorage.getItem('forvo-light-apikey')
	this.qc = new search.QueryCounter(apikey)

	this.items = this.transform()
    }

    lang_parse() {
	if (!this.opt.langlist) return []
	let ll = this.opt.langlist.trim().split(/\s+/)
	for (let val of ll) {
	    if (!lang.is_valid(val))
		throw new Error(`This favourite lang is incorrect: ${val}`)
	}
	return [...new Set(ll)].reverse()
    }

    // in place
    sort(items) {
	let langlist = this.lang_parse()

	let lang_rate = (item) => {
	    let pos = langlist.indexOf(item.lang)
	    return langlist.indexOf(item.lang) === -1 ? 0 : pos + 1
	}

	items.sort(firstBy( (a, b) => {
	    return lang_rate(b) - lang_rate(a)
	}).thenBy( (a, b) => {
	    return a.lang.localeCompare(b.lang)
	}).thenBy( (a, b) => {
	    return b._rate - a._rate
	}).thenBy( (a, b) => {
	    return a.country.localeCompare(b.country)
	}))
    }

    transform() {
	let r = []
	for (let val of this.data.items) {
	    let word = {}
	    word.original = val.original

	    if (val.num_pronunciations !== undefined) {
		word.link = this.hyperlink({'q': `. ${word.original}`})
		word.more = val.num_pronunciations
	    }
	    if (val.standard_pronunciation) val = val.standard_pronunciation

	    word.lang = val.code
	    word.country = val.country_code || val.country || ''

	    word.upvotes = val.num_positive_votes
	    word.downvotes = val.num_votes - word.upvotes
	    if (word.upvotes === 0) word.upvotes = null
	    if (word.downvotes === 0) word.downvotes = null
	    word._rate = val.rate || 0 // for sorting only

	    // https in Audio() supported from Android 3.1 onwards only
	    word.mp3 = val.pathmp3.replace(/^https/, 'http')
	    word.expire = Date.now() + 60*60*2 * 1000 // in 2 hours
	    word.male = val.sex === 'm'
	    word.user = val.username

	    r.push(word)
	}

	try {
	    this.sort(r)
	} catch (err) {
	    this.error = err
	    return
	}

	return r
    }

    post_render() {
	this.attach('.player', 'click', this.player)
    }

    player(event, node) {
	event.preventDefault()

	if (!conf.is_online()) {
	    alert('The device is offline')
	    return
	}
	let expire = parseInt(node.getAttribute('data-expire'))
	if (Date.now() > expire) {
	    alert('The query has expired')
	    return
	}

	node.ForvoLight = node.ForvoLight || {}
	let audio = node.ForvoLight.audio
	if (audio) {
	    log(`player: reusing; audio.paused=${audio.paused}`)
	    if (audio.paused || node.ForvoLight.audio_ended) {
		log('player: PLAY')
		node.ForvoLight.audio_ended = false
		audio.play()
	    } else {
		log('player: PAUSE')
		audio.pause()
	    }
	    return
	}

	node.ForvoLight.audio = new Audio()
	audio = node.ForvoLight.audio

	 // Android 2.3 doesn't support dataset
	let mp3 = node.getAttribute('data-mp3')
	log(`player URL: ${mp3}`)
        audio.src = mp3
	audio.type = 'audio/mpeg'

	let loadstart = () => {
	    // a spinner
	    node.innerHTML = '<i class="fa fa-spinner fa-spin fa-fw fa-2x"></i>'
        }
        let pause = () => {
	    node.innerHTML = '<i class="fa fa-pause fa-2x"></i>'
        }
        let ended = () => {
	    node.innerHTML = '<i class="fa fa-play-circle fa-2x"></i>'
	    node.ForvoLight.audio_ended = true
        }

        let error = (evt) => { // doesn't fire on Android 2.3.4
	    log('player error', evt)
	    node.innerHTML = '<i class="fa fa-exclamation-triangle fa-2x"></i>'
	    node.ForvoLight.audio_ended = true
        }
        let suspend = () => {
	    // spinner
	    node.innerHTML = '<i class="fa fa-snowflake-o fa-spin fa-fw fa-2x"></i>'
        }
        let abort = (evt) => {
	    log('player abort', evt)
	    node.innerHTML = 'A'
        }
        let emptied = (evt) => {
	    log('player emptied', evt)
	    node.innerHTML = 'E'
        }
        let stalled = (evt) => {
	    log('player stalled', evt)
	    // spinner
	    node.innerHTML = '<i class="fa fa-crosshairs fa-spin fa-fw fa-2x"></i>'
        }

	audio.addEventListener('loadstart', loadstart)
	// Android 2.3.4 after audio.play() after audio.pause()
	audio.addEventListener('durationchange', loadstart)
	audio.addEventListener('play', loadstart)
	audio.addEventListener('pause', pause)
        audio.addEventListener('ended', ended)

        audio.addEventListener('error', error)
        audio.addEventListener('suspend', suspend)
        audio.addEventListener('abort', abort)
        audio.addEventListener('emptied', emptied)
        audio.addEventListener('stalled', stalled)

	audio.play()
	this.qc.inc()
    }
}

class ForvoPopularPronouncedWords extends Page {
    constructor(container, data) {
	super(container, '#tmpl_forvo_popular_pronounced_words')
	if (!data || !data.items || !data.items.length) {
	    this.error = new Error('No popular words this time')
	    return
	}
	this.items = this.transform(data)
    }

    transform(data) {
	return data.items.map( val => {
	    return {
		original: val.original,
		link: this.hyperlink({'q': `. ${val.original}`}),
		num_pronunciations: val.num_pronunciations
	    }
	})
    }
}


/* Main */

// app global options
/* global Connection */
let conf = new function() {
    let usp = new search.URLSearchParams(location.hash)
    this.debug = usp.get('debug')
    this.is_online = function() {
	if (!window.cordova) return true
	return navigator.connection.type !== Connection.NONE
    }
}

let log = console.log.bind(console)

let page_navigate = function() {
    log('*** page_navigate()')
    let nav = new NavService('#nav a')
    let mode = new search.URLSearchParams(location.hash).get('m') || 'search'
    // mark the current node as 'user selected'
    for (let node of nav.anchors) {
	let params = new search.URLSearchParams(node.hash)
	node.className = mode === params.get('m') ? 'selected' : ""
    }

    let page
    switch (mode) {
    case 'about':
	page = new PageAbout('#app')
	break
    case 'history':
	page = new PageHistory('#app')
	break
    case 'preferences':
	page = new PagePreferences('#app')
	break
    default:
	page = new PageSearch('#app')
    }

    nav.update()
    page.render()
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("hashchange", page_navigate)
    page_navigate()
})

if (window.cordova) {
    document.addEventListener('deviceready', () => {
	document.addEventListener('backbutton', (evt) => {
            evt.preventDefault()
            if (confirm('Exit?')) navigator.app.exitApp()
	})
    })
}
