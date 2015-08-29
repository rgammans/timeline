SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%.js=lib/%.js)
LIB += lib/browser-polyfill.js

lib: $(LIB)

lib/browser-polyfill.js: node_modules/babel-core/browser-polyfill.js
	cp $< $@

lib/%.js: src/%.js
	mkdir -p $(@D)
	babel  $< -o $@

node_modules/babel-core/browser-polyfill.js:
	npm install babel-core

