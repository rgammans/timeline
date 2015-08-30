SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)
#Jquery is required by w2ui and that pull it in via bower.
LIB += lib/browser-polyfill.js lib/jquery.js lib/jquery-ui.min.js lib/ui/datepicker.js
CSS = css/ui/datepicker.css css/ui/jquery-ui.min.css css/ui/images/ui-icons_444444_256x240.png
THEME = base

all: lib css

css: $(CSS)
lib: $(LIB)

lib/browser-polyfill.js: node_modules/babel-core/browser-polyfill.js
	mkdir -p $(@D)
	cp $< $@

lib/jquery.js: bower_components/jquery/dist/jquery.js
	mkdir -p $(@D)
	cp $< $@

lib/jquery-ui.min.js: bower_components/jquery-ui/jquery-ui.min.js
	mkdir -p $(@D)
	cp $< $@

lib/ui/datepicker.js: bower_components/jquery-ui/ui/datepicker.js
	mkdir -p $(@D)
	cp $< $@

css/ui/datepicker.css: bower_components/jquery-ui/themes/$(THEME)/datepicker.css
	mkdir -p $(@D)
	cp $< $@

css/ui/jquery-ui.min.css: bower_components/jquery-ui/themes/$(THEME)/jquery-ui.min.css
	mkdir -p $(@D)
	cp $< $@

css/ui/images/ui-icons_444444_256x240.png:  bower_components/jquery-ui/themes/$(THEME)/images/ui-icons_444444_256x240.png
	mkdir -p $(@D)
	cp $< $@

lib/%.js: src/%.js
	mkdir -p $(@D)
	babel  $< -o $@

node_modules/babel-core/browser-polyfill.js:
	npm install babel-core

bower_components/%  :
	bower install

