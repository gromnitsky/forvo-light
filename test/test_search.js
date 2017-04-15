#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')

let Storage = require('dom-storage')
global.localStorage = new Storage(null, { strict: true })

let search = require('../src/search')
let lang = require('../src/lang')

suite('lang', function() {
    test('names_to_codes', function() {
	assert(Object.keys(lang.names_to_codes()).length > 300)
    })
})

suite('misc', function() {
    setup(function() {
    })

    test('parse_query', function() {
	assert.deepEqual(search.parse_query(),
			 { type: 'pronounced-words-search', q: '' })

	assert.deepEqual(search.parse_query(' .'),
			 { type: 'word-pronunciations', q: '' })
	assert.deepEqual(search.parse_query('.'),
			 { type: 'word-pronunciations', q: '' })
	assert.deepEqual(search.parse_query('. hello  world'),
			 { type: 'word-pronunciations', q: 'hello world' })
	assert.deepEqual(search.parse_query('.wp hello  world'),
			 { type: 'word-pronunciations', q: 'hello world' })

	assert.deepEqual(search.parse_query('.an-unknown-type'),
			 { type: 'pronounced-words-search', q: '' })
    })

    test('req_url', function() {
	assert.equal(search.req_url(), null)
	assert.equal(search.req_url('XXX'), null)

	assert.equal(search.req_url('XXX', search.parse_query()), null)

	assert.equal(search.req_url('XXX', search.parse_query('avaux')),
		     'https://apifree.forvo.com/key/XXX/format/json/action/pronounced-words-search/search/avaux')
	assert.equal(search.req_url('XXX', search.parse_query('. cat shark')),
		     'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark')

	assert.equal(search.req_url('XXX', search.parse_query('. cat shark'),
				    'invalid'),
		     null)
	assert.equal(search.req_url('XXX', search.parse_query('. cat shark'),
				    'en'),
		     'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark/language/en')
    })
})

suite('History', function() {
    test('size=3', function() {
	let h = new search.History(3)
	h.add(1).add(2).add(3).add(4).add(5)
	assert.deepEqual(h._arr, [5,4,3])
	h.add(3)
	assert.deepEqual(h._arr, [3,5,4])
    })

    test('size=1', function() {
	let h = new search.History(1)
	h.add(1).add(2).add(3).add(4).add(5)
	assert.deepEqual(h._arr, [5])
    })

    test('iterator', function() {
	let h = new search.History(3)
	h.add(1).add(2).add(3)
	assert.deepEqual([...h], [3,2,1])
    })

    test('save/load', function() {
	let h = new search.History(3)
	h.add(1).add(2).add(3)
	assert.deepEqual(JSON.parse(localStorage.getItem('forvo-light-history')), [3,2,1])

	localStorage.setItem('forvo-light-history', null)
	h.load()
	assert.deepEqual(h._arr, [3,2,1])

	localStorage.setItem('forvo-light-history', JSON.stringify({foo:1}))
	h.load()
	assert.deepEqual(h._arr, [3,2,1])

	localStorage.setItem('forvo-light-history', JSON.stringify([]))
	h.load()
	assert.deepEqual(h._arr, [])
    })
})
