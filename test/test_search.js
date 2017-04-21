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

    test('query_parse', function() {
	assert.deepEqual(search.query_parse(),
			 { type: '.pws', q: '' })

	assert.deepEqual(search.query_parse(' .'),
			 { type: '.wp', q: '' })
	assert.deepEqual(search.query_parse('.'),
			 { type: '.wp', q: '' })
	assert.deepEqual(search.query_parse('. hello  world'),
			 { type: '.wp', q: 'hello world' })
	assert.deepEqual(search.query_parse('.wp hello  world'),
			 { type: '.wp', q: 'hello world' })

	assert.deepEqual(search.query_parse('hello world'),
			 { type: '.pws', q: 'hello world' })
	assert.deepEqual(search.query_parse('.an-unknown-type'),
			 { type: '.pws', q: '' })
    })

    test('query_restore', function() {
	assert.equal(search.query_restore(), "")
	assert.equal(search.query_restore({type: '.wp', q: ''}), ".")
	assert.equal(search.query_restore({type: '.wp', q: '1 2'}), ". 1 2")
	assert.equal(search.query_restore({type: '.top', q: ''}), ".top")
	assert.equal(search.query_restore({type: '.pws', q: 'hello'}), "hello")
	assert.equal(search.query_restore({type: '.pws', q: ''}), "")
    })

    test('req_url', function() {
	assert.equal(search.req_url(), null)
	assert.equal(search.req_url('XXX'), null)

	assert.equal(search.req_url('XXX', search.query_parse()), null)

	assert.equal(search.req_url('XXX', search.query_parse('avaux')),
		     'https://apifree.forvo.com/key/XXX/format/json/action/pronounced-words-search/search/avaux')
	assert.equal(search.req_url('XXX', search.query_parse('. cat shark')),
		     'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark')

	assert.equal(search.req_url('XXX', search.query_parse('. cat shark'),
				    'invalid'),
		     null)
	assert.equal(search.req_url('XXX', search.query_parse('. cat shark'),
				    'en'),
		     'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark/language/en')
	assert.equal(search.req_url('XXX', search.query_parse('. cat shark'),
				    '-'),
		     'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark')
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

suite('QueryCounter', function() {
    setup(function() {
	localStorage.clear()
    })

    test('inc', function() {
	let qc = new search.QueryCounter('XXX')
	let t = new Date('2000-10-10T00:00:00.000Z')

	qc.inc(t)
	assert.deepEqual(qc.db, { 'XXX': { deadline: 971215200000, counter: 1 } })

	qc.inc(t)
	assert.deepEqual(qc.db, { 'XXX': { deadline: 971215200000, counter: 2 } })

	qc.inc(new Date('2000-10-10T22:00:01.000Z'))
	assert.deepEqual(qc.db, { 'XXX': { deadline: 971301600000, counter: 1 } })
    })

    test('save/load', function() {
	let qc = new search.QueryCounter('XXX')
	let t = new Date('2000-10-10T00:00:00.000Z')
	qc.inc(t)
	qc.inc(t)
	qc.inc(t)
	assert.deepEqual(JSON.parse(localStorage.getItem(qc.db_name)),
			 {'XXX': {counter: 3, deadline: 971215200000}})

	// don't load invalid values
	localStorage.setItem(qc.db_name, '[]')
	qc.load()
	assert.deepEqual(qc.db, {'XXX': {counter: 3, deadline: 971215200000}})

	localStorage.setItem(qc.db_name, '{"foo": 1}')
	qc.load()
	assert.deepEqual(qc.db, {"foo": 1})

	qc.inc(new Date('2000-10-10T22:00:01.000Z'))
	assert.deepEqual(qc.db.XXX, { counter: 1, deadline: 971301600000 })
    })
})
