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

$(cordova.dest)/config.xml: $(cordova.src)/config.xml package.json
	$(mkdir)
	erb -T - -r json $< > $@

$(cordova.dest)/.target.setup: $(cordova.dest)/config.xml
	for idx in platforms plugins www; do rm -rf $(dir $@)/$$idx; done
	cp $(cordova.src)/*.png $(cordova.dest)/
	cd $(dir $@) && ln -sf ../src www
	cd $(dir $@) && $(cordova) platforms add android
	rm -rf $(dir $@)/platforms/android/res/drawable*
	cd $(dir $@) && $(cordova) plugin --noregistry --link --searchpath ../node_modules add cordova-plugin-keyboard cordova-plugin-network-information
	touch $@

$(cordova.dest)/.target.build: $(cordova.dest)/.target.setup $(compile.all)
	cd $(dir $@) && $(cordova) build
	touch $@

.PHONY: cordova-setup
cordova-setup: $(cordova.dest)/.target.setup

.PHONY: cordova
cordova: $(cordova.dest)/.target.build

.PHONY: cordova-install
cordova-install: $(cordova.dest)/.target.build
	-adb uninstall gromnitsky.forvolight
	adb install $(cordova.dest)/platforms/android/ant-build/MainActivity-debug.apk
