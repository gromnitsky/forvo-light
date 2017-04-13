.DELETE_ON_ERROR:

.PHONY: compile
compile:

out := .
mk := $(dir $(lastword $(MAKEFILE_LIST)))
npm.root := /opt/lib/node_modules
export NODE_PATH := $(realpath node_modules)

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@



node_modules: package.json
	npm i
	touch $@

package.json: $(mk)/package.json
	$(copy)



src.files := $(wildcard $(mk)/src/*)

assets.src := $(filter-out %.js, $(src.files))
assets.dest := $(patsubst $(mk)/%, $(out)/%, $(assets.src))

$(assets.dest): $(out)/%: $(mk)/%
	$(mkdir)
	$(copy)

vendor.src := $(wildcard $(mk)/vendor/*)
vendor.dest := $(patsubst $(mk)/%, $(out)/src/%, $(vendor.src))

$(vendor.dest): $(out)/src/%: $(mk)/%
	$(mkdir)
	$(copy)

compile: $(assets.dest) $(vendor.dest)



js.src := $(filter %.js, $(src.files))
js.ccache := $(out)/.ccache/js
js.dest := $(patsubst $(mk)/src/%.js, $(js.ccache)/%.js, $(js.src))

$(js.dest): $(js.ccache)/%.js: $(mk)/src/%.js
	$(mkdir)
	babel $< -o $@ --presets $(npm.root)/babel-preset-es2015 -s inline

$(js.dest): node_modules
compile: $(js.dest)



$(out)/src/app.browserify.js: $(js.ccache)/app.js
	$(mkdir)
	browserify $< -o $@

compile: $(out)/src/app.browserify.js
