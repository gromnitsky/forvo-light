.DELETE_ON_ERROR:

.PHONY: compile
compile:
compile.all :=

out := .
mk := $(dir $(lastword $(MAKEFILE_LIST)))
npm.root := $(or $(wildcard /opt/lib/node_modules), $(shell npm -g root))
export NODE_PATH := $(realpath node_modules)

mkdir = @mkdir -p $(dir $@)
copy = cp $< $@



node_modules: package.json
	npm i
	touch $@

package.json: $(mk)/package.json
	$(copy)



src.files := $(wildcard $(mk)/src/*)

assets.src := $(filter-out %.json, $(filter-out %.js, $(src.files)))
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
compile.all += $(assets.dest) $(vendor.dest)



js.src := $(filter %.js, $(src.files))
js.ccache := $(out)/.ccache
js.dest := $(patsubst $(mk)/src/%.js, $(js.ccache)/%.js, $(js.src))

$(js.dest): $(js.ccache)/%.js: $(mk)/src/%.js
	$(mkdir)
	babel $< -o $@ --presets $(npm.root)/babel-preset-es2015 -s inline

$(js.dest): node_modules
compile: $(js.dest)
compile.all += $(js.dest)

json.src := $(filter %.json, $(src.files))
json.dest := $(patsubst $(mk)/src/%.json, $(js.ccache)/%.json, $(json.src))

$(json.dest): $(js.ccache)/%.json: $(mk)/src/%.json
	$(mkdir)
	$(copy)

compile: $(json.dest)
compile.all += $(json.dest)



$(out)/src/main.browserify.js: $(js.ccache)/main.js
	$(mkdir)
	browserify -d $< -o $@

$(out)/src/main.browserify.js: $(js.dest)
compile: $(out)/src/main.browserify.js
compile.all += $(out)/src/main.browserify.js



.PHONY: server
server: kill
	$(mk)/test/server &

.PHONY: kill
kill:
	-pkill -f 'node $(mk)/test/server'



cordova := nodever exec 4.8 cordova
cordova.src := $(mk)/cordova
cordova.dest := $(out)/cordova

$(cordova.dest)/config.xml: $(cordova.src)/config.xml
	$(mkdir)
	erb -T - -r json $< > $@

$(cordova.dest)/config.xml: $(compile.all)

$(cordova.dest)/.target: $(cordova.dest)/config.xml
	cp $(cordova.src)/*.png $(cordova.dest)
	[ -d $(dir $@)/www ] || (cd $(dir $@) && ln -sf ../src www)
	-cd $(dir $@) && $(cordova) platforms add android
	rm -rf $(dir $@)/platforms/android/res/drawable*
	cd $(dir $@) && $(cordova) build
	touch $@

.PHONY: cordova
cordova: $(cordova.dest)/.target
