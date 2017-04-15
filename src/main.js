'use strict';

require("babel-polyfill")
let Mustache = require('mustache')
let URLSearchParams = require('url-search-params')
let jsonp = require('jsonp')

let meta = require('../package.json')
let lang = require('./lang')
let search = require('./search')

class Page {
    constructor(container_id, template_id) {
	this.container = document.querySelector(container_id)
	this.$ = (str) => {
	    let nodes = this.container.querySelectorAll(str)
	    return nodes.length === 1 ? nodes[0] : nodes
	}
	this.template_id = template_id
	this.template = document.querySelector(template_id)
    }

    attach(selector, event, fn) {
	let node = this.$(selector)
	node.addEventListener(event, (evt) => fn.call(this, evt, node))
    }

    render() {
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
    }

    post_render() {
	this.attach('form', 'submit', this.save)
    }

    save(event) {
	event.preventDefault()

	let btn = this.$('button')
	btn.disabled = true

	localStorage.setItem('forvo-light-api-key', this.$('input').value)

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
    }

    post_render() {
	this.attach('form', 'submit', this.submit)
    }

    output(html) {
	this.$('#search__output').innerHTML = html
    }

    submit(event) {
	event.preventDefault()

	let apikey = localStorage.getItem('forvo-light-api-key')
	if (!apikey) {
	    this.output('No API key')
	    return
	}

	search.forvo = {	// FIXME
	    protocol: 'http',
	    host: '127.0.0.1',
	    port: 8080
//	    host: '192.168.197.115',
//	    port: 9880
	}
	let query = search.parse_query(this.$('input').value)
	let url = search.req_url(apikey, query, this.$('select').value)
	if (!url) {
	    this.output('Invalid query')
	    return
	}

	console.log(url)
	jsonp(url, {timeout: 2000}, (err, data) => {
	    if (err) {
		this.output(`${search.forvo.host}:${search.forvo.port} ${err}`)
		return
	    }
	    console.log(data)

	    let widget
	    switch (query.type) {
	    case 'word-pronunciations':
		this.output('TODO')
		return
	    case 'top20':
		this.output('TODO')
		return
	    default:
		widget = new ForvoPronouncedWordsSearch('#search__output', data)
	    }
	    widget.render()
	})
    }
}

class ForvoPronouncedWordsSearch extends Page {
    constructor(container, data) {
	super(container, '#tmpl_forvo_pronounced-words-search')
	this.items = this.transform(data)
    }

    transform(data) {
	let r = []
	for (let val of data.items) {
	    let word = {}
	    word.original = val.original
	    word.lang = val.standard_pronunciation.langname
	    word.country = val.standard_pronunciation.country

	    word.upvotes = val.standard_pronunciation.num_positive_votes
	    word.downvotes = val.standard_pronunciation.num_votes - word.upvotes
	    if (word.upvotes === 0) word.upvotes = null
	    if (word.downvotes === 0) word.downvotes = null

	    word.mp3 = val.standard_pronunciation.pathmp3
	    word.expire = Date.now() + 60*60*2 * 1000 // in 2 hours
	    word.male = val.standard_pronunciation.sex === 'm'
	    word.user = val.standard_pronunciation.username

	    r.push(word)
	}
	return r
    }
}



/* Main */

let page_navigate = function(node) {
    let aaa = node.parentElement.querySelectorAll('a')
    // IE11 doesn't support forEach for NodeList
    for (let idx = 0; idx < aaa.length; ++idx) aaa[idx].className = ''
    node.className = 'selected'

    let page
    if (node.hash.match(/^#\/about\/?/)) {
	page = new PageAbout('#app')
    } else if (node.hash.match(/^#\/history\/?/)) {
	page = new PageHistory('#app')
    } else if (node.hash.match(/^#\/preferences\/?/)) {
	page = new PagePreferences('#app')
    } else {
	page = new PageSearch('#app')
    }

    page.render()
}

let page_select = function() {
    let mode = location.hash.match('^#/([a-z]+)/?') || []
    page_navigate(document.querySelector(`#nav > a[href="#/${mode[1]}"]`)
		  || document.querySelector('#nav > a'))
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("hashchange", page_select)
    page_select()
})
