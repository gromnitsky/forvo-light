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
	assert.deepEqual(new search.Query().parse(),
			 { type: '.pws', q: '' })

	assert.deepEqual(new search.Query(' .').parse(),
			 { type: '.wp', q: '' })
	assert.deepEqual(new search.Query('.').parse(),
			 { type: '.wp', q: '' })
	assert.deepEqual(new search.Query('. hello  world').parse(),
			 { type: '.wp', q: 'hello world' })
	assert.deepEqual(new search.Query('.wp hello  world').parse(),
			 { type: '.wp', q: 'hello world' })

	assert.deepEqual(new search.Query('hello world').parse(),
			 { type: '.pws', q: 'hello world' })
	assert.deepEqual(new search.Query('.an-unknown-type').parse(),
			 { type: '.pws', q: '' })

	// pages
	assert.deepEqual(new search.Query('hello world .2 .0').parse(),
			 { type: '.pws', q: 'hello world', p: 1 })

    })

    test('query_restore', function() {
	let sq = new search.Query()
	let fn = sq.restore.bind(sq)
	assert.equal(fn(), "")
	assert.equal(fn({type: '.wp', q: ''}), ".")
	assert.equal(fn({type: '.wp', q: '1 2'}), ". 1 2")
	assert.equal(fn({type: '.top', q: ''}), ".top")
	assert.equal(fn({type: '.pws', q: 'hello'}), "hello")
	assert.equal(fn({type: '.pws', q: ''}), "")

	// pages
	assert.equal(fn({type: '.pws', q: 'hello', p: 1}), "hello .1")

    })

    test('req_url', function() {
	assert.equal(new search.Query().req_url(), null)

	let sq = new search.Query('', { apikey: 'XXX' })
	assert.equal(sq.req_url(), null)

	sq.orig = 'avaux'
	assert.equal(sq.req_url(), 'https://apifree.forvo.com/key/XXX/format/json/action/pronounced-words-search/search/avaux')

	sq.orig = '. cat shark'
	assert.equal(sq.req_url(), 'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark')

	sq.opt.lang_code = 'invalid'
	assert.equal(sq.req_url(), null)

	sq.opt.lang_code = 'en'
	assert.equal(sq.req_url(), 'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark/language/en')

	sq.opt.lang_code = '-'
	assert.equal(sq.req_url(), 'https://apifree.forvo.com/key/XXX/format/json/action/word-pronunciations/word/cat%20shark')

	// pages
	sq.opt.lang_code = null
	sq.orig = 'avaux .2 .1'
	assert.equal(sq.req_url(), 'https://apifree.forvo.com/key/XXX/format/json/action/pronounced-words-search/search/avaux/page/1')
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
