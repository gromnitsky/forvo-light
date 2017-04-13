'use strict';

require("babel-polyfill")
let Mustache = require('mustache')

let meta = require('../package.json')

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

    render() {
	let id = this.template_id.replace(/^#tmpl_/, '')
	this.container.innerHTML = Mustache.render(`<div id=${id}>` + this.template.innerHTML + '</div>', this)
	if (this.bind) this.bind()
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
    }

    bind() {
	this.$('button').onclick = this.query
    }

    query() {
	alert('hi')
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
    page_navigate(document.querySelector(`#header > a[href="#/${mode[1]}"]`)
		  || document.querySelector('#header > a'))
}

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener("hashchange", page_select)
    page_select()
})
