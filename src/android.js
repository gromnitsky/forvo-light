'use strict';
/* global Keyboard, Connection */

let search = require('./search')

class Android {
    constructor(opt) {
	this.conf = opt.conf
	this.PageSearch = opt.PageSearch
	this.log = opt.log

	if (window.cordova)
	    document.addEventListener('deviceready', () => this.deviceready())
    }

    is_online() {
	if (!window.cordova) return true
	return navigator.connection.type !== Connection.NONE
    }

    deviceready() {
	document.addEventListener('backbutton', (evt) => {
            evt.preventDefault()
            if (confirm('Exit?')) navigator.app.exitApp()
	})

	document.addEventListener("searchbutton", (evt) => {
            evt.preventDefault()

	    this.log('searchbutton')
	    // switch to PageSearch & focus on the input, deleting its
	    // current value
	    if (this.conf.page instanceof this.PageSearch) {
		let input = this.conf.page.$('input')
		input.value = ''
		window.scrollTo(0, 0)
		input.focus()
		Keyboard.show()
	    } else {
		let ls = new search.URLSearchParams(location.hash)
		ls.set('m', 'search')
		ls.set('q', '')
		window.location = `${location.pathname}#?${ls}`
		setTimeout( () => {
		    let input = document.querySelector('#search input')
		    input.focus()
		    Keyboard.show()
		}, 300)
	    }
	})
    }
}

module.exports = Android
