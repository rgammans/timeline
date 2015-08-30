SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)
LIB += lib/browser-polyfill.js s lib/jquery.js

lib: $(LIB)

lib/browser-polyfill.js: node_modules/babel-core/browser-polyfill.js
	mkdir -p $(@D)
	cp $< $@

lib/jquery.js: bower_components/jquery/dist/jquery.js
	mkdir -p $(@D)
	cp $< $@

lib/%.js: src/%.js
	mkdir -p $(@D)
	babel  $< -o $@

node_modules/babel-core/browser-polyfill.js:
	npm install babel-core

bower_components/jquery/dist/jquery.js:
	bower install

