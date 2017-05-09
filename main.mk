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

define compile-push
compile: $(1)
compile.all += $(1)
endef

prog.ver := $(shell json < $(mk)/package.json version)



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

$(eval $(call compile-push, $(assets.dest) $(vendor.dest)))



js.src := $(filter %.js, $(src.files))
js.ccache := $(out)/.ccache
js.dest := $(patsubst $(mk)/src/%.js, $(js.ccache)/%.js, $(js.src))

$(js.dest): $(js.ccache)/%.js: $(mk)/src/%.js
	$(mkdir)
	babel $< -o $@ --presets $(npm.root)/babel-preset-es2015 -s inline

$(js.dest): node_modules
$(eval $(call compile-push, $(js.dest)))

json.src := $(filter %.json, $(src.files))
json.dest := $(patsubst $(mk)/src/%.json, $(js.ccache)/%.json, $(json.src))

$(json.dest): $(js.ccache)/%.json: $(mk)/src/%.json
	$(mkdir)
	$(copy)

$(eval $(call compile-push, $(json.dest)))



$(out)/src/main.browserify.js: $(js.ccache)/main.js
	$(mkdir)
	browserify -d $< -o $@

$(out)/src/main.browserify.js: $(js.dest)
$(eval $(call compile-push, $(out)/src/main.browserify.js))



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
	cd $(dir $@) && $(cordova) plugin --noregistry --link --searchpath ../node_modules add cordova-plugin-network-information cordova-plugin-inappbrowser
	touch $@

cordova.patch0.dest := $(cordova.dest)/platforms/android/src/gromnitsky/forvolight/MainActivity.java
$(cordova.patch0.dest): $(cordova.src)/MainActivity.java $(cordova.dest)/.target.setup
	$(mkdir)
	$(copy)

$(cordova.dest)/.target.build: $(cordova.patch0.dest) $(compile.all)
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




.PHONY: upload-web
upload-web: $(compile.all)
	rsync -avPL --delete -e ssh $(out)/src/ gromnitsky@web.sourceforge.net:/home/user-web/gromnitsky/htdocs/js/forvo-light

.PHONY: upload-apk
upload-apk: $(cordova.dest)/.target.build
	rsync -avPL -e ssh $(cordova.dest)/platforms/android/ant-build/MainActivity-debug.apk gromnitsky@web.sourceforge.net:/home/user-web/gromnitsky/htdocs/android/apk/forvo-light-$(prog.ver)-debug.apk

.PHONY: upload
upload: upload-web upload-apk
