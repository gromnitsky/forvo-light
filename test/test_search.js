#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')

let search = require('../src/search')
let lang = require('../src/lang')

suite('lang', function() {
    test('names_to_codes', function() {
	assert(Object.keys(lang.names_to_codes()).length > 300)
    })
})

suite('Simple', function() {
    setup(function() {
    })

    test('parse_query', function() {
	assert.deepEqual(search.parse_query(),
			 { type: 'pronounced-words-search', q: '' })

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
