'use strict';

require("babel-polyfill")
let Mustache = require('mustache')

class Page {
    constructor(template_id) {
	this.html = Mustache.render(document.querySelector(template_id).innerHTML, this)
    }
}

class PageAbout extends Page {
    constructor() {
	super('#tmpl_about')
    }
}

class PagePreferences extends Page {
    constructor() {
	super('#tmpl_preferences')
    }
}

class PageSearch extends Page {
    constructor() {
	super('#tmpl_search')
    }
}


/* Main */
let app = document.getElementById('app')

let page_navigate = function(node) {
    let aaa = node.parentElement.querySelectorAll('a')
    // IE11 doesn't support forEach for NodeList
    for (let idx = 0; idx < aaa.length; ++idx) aaa[idx].className = ''
    node.className = 'selected'

    let page
    if (node.hash.match(/^#\/about\/?/)) {
	page = new PageAbout()
    } else if (node.hash.match(/^#\/preferences\/?/)) {
	page = new PagePreferences()
    } else {
	page = new PageSearch()
    }

    app.innerHTML=page.html
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
