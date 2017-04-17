'use strict';

require("babel-polyfill")
let Mustache = require('mustache')
let jsonp = require('jsonp')

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
	console.log(location.hash)
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
	this.$ = (str) => {
	    let nodes = this.container.querySelectorAll(str)
	    return nodes.length === 1 ? nodes[0] : nodes
	}
	this.template_id = template_id
	this.template = document.querySelector(template_id)
	this.nav = new NavService('#nav a')
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

    render() {
	log(this.constructor.name, 'render()')
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
}

class PagePreferences extends Page {
    constructor(container) {
	super(container, '#tmpl_preferences')
	this.apikey = localStorage.getItem('forvo-light-api-key')
	this.server_opts = localStorage.getItem('forvo-light-server-opt')
	this.debug = conf.debug
    }

    post_render() {
	this.attach('form', 'submit', this.save)
    }

    save(event) {
	event.preventDefault()

	let btn = this.$('button')
	btn.disabled = true

	localStorage.setItem('forvo-light-api-key',
			     this.$('#preferences__apikey').value)
	localStorage.setItem('forvo-light-server-opt',
			     this.$('#preferences__debug__server-opt').value)

	setTimeout( () => {
	    btn.disabled = false
	}, 500)
    }
}

class PageHistory extends Page {
    constructor(container) {
	super(container, '#tmpl_history')
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

	this.$('form select').value = conf.lsearch().get('l') || "-"

	// auto-submit the form
	let form_input = this.$('form input')
	form_input.value = conf.lsearch().get('q')
	if (form_input.value.trim()) this.$('form button').click()
    }

    output(html) {
	this.$('#search__output').innerHTML = html
    }

    server_opt_set() {
	if (!conf.debug) return true

	let opt = localStorage.getItem('forvo-light-server-opt')
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

	let apikey = localStorage.getItem('forvo-light-api-key')
	if (!apikey) {
	    this.output('No API key')
	    return
	}
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

	// show a spinner
	this.output('<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>')
	// disable the button
	let button = this.$('form button')
	button.disabled = true

	log('jsonp URL', url)
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

	    this.history.add(search.query_restore(query))
	    this.url_update(query, lang)

	    let widget
	    switch (query.type) {
	    case '.wp':
		widget = new ForvoPronouncedWordsSearch('#search__output', data)
		break
	    case '.top':
		this.output('TODO')
		return
	    default:
		// pronounced-words-search
		widget = new ForvoPronouncedWordsSearch('#search__output', data)
	    }
	    widget.render()
	})
    }

    url_update(query, lang) {
	let ls = conf.lsearch()
	ls.set('q', search.query_restore(query))
	ls.set('l', lang)
	// FIXME: do a push instead but check if the prev state !== the cur
	window.history.replaceState({}, '', `${location.pathname}#?${ls}`)
	this.nav.update()
    }

    validate_response(json) {
	if (!json || json === {}) throw new Error('Empty response')
	if (json instanceof Array) throw new Error(`Forvo API: ${json}`)
    }
}

// handles both .wp & .pws
class ForvoPronouncedWordsSearch extends Page {
    constructor(container, data) {
	super(container, '#tmpl_forvo_pronounced-words-search')
	this.items = this.transform(data)
    }

    transform(data) {
	let r = []
	let ls = conf.lsearch()

	for (let val of data.items) {
	    let word = {}
	    word.original = val.original
	    if (val.num_pronunciations !== undefined) {
		ls.set('q', `. ${word.original}`)
		word.link = `${location.pathname}#?${ls}`
	    }
	    if (val.standard_pronunciation) val = val.standard_pronunciation

	    word.lang = val.code
	    word.country = val.country_code || val.country

	    word.upvotes = val.num_positive_votes
	    word.downvotes = val.num_votes - word.upvotes
	    if (word.upvotes === 0) word.upvotes = null
	    if (word.downvotes === 0) word.downvotes = null

	    word.mp3 = val.pathmp3
	    word.expire = Date.now() + 60*60*2 * 1000 // in 2 hours
	    word.male = val.sex === 'm'
	    word.user = val.username

	    r.push(word)
	}
	return r
    }

    post_render() {
	this.attach('.player', 'click', this.player)
    }

    player(event, node) {
	event.preventDefault()
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

	node.ForvoLight.audio = document.createElement('audio')
	audio = node.ForvoLight.audio

	 // Android 2.3 doesn't support dataset
	let mp3 = node.getAttribute('data-mp3')
	log('player URL', mp3)
        audio.src = mp3

	let loadstart = () => {
	    // a spinner
	    node.innerHTML = '<i class="fa fa-spinner fa-spin fa-fw"></i>'
        }
        let pause = () => {
	    node.innerHTML = '<i class="fa fa-pause"></i>'
        }
        let ended = () => {
	    node.innerHTML = '<i class="fa fa-play-circle"></i>'
	    node.ForvoLight.audio_ended = true
        }

        let error = (evt) => { // doesn't fire on Android 2.3.4
	    console.log('player error', evt)
	    node.innerHTML = '<i class="fa fa-exclamation-triangle"></i>'
	    node.ForvoLight.audio_ended = true
        }
        let suspend = (evt) => {
	    console.log('player suspend', evt)
	    node.innerHTML = 'S'
        }
        let abort = (evt) => {
	    console.log('player abort', evt)
	    node.innerHTML = 'A'
        }
        let emptied = (evt) => {
	    console.log('player emptied', evt)
	    node.innerHTML = 'E'
        }
        let stalled = (evt) => {
	    console.log('player stalled', evt)
	    node.innerHTML = 'B'
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
    }
}


/* Main */

// app global options
let conf = new function() {
    this.lsearch = () => new search.URLSearchParams(location.hash)
    this.debug = this.lsearch().get('debug')
}

let log = conf.debug ? console.log.bind(console) : () => {}

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
