'use strict';

require("babel-polyfill")
let Mustache = require('mustache')
let URLSearchParams = require('url-search-params')

let meta = require('../package.json')
let lang = require('./lang')

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

    submit(event) {
	event.preventDefault()
	console.log('query')
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
