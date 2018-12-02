Timeline
========


A JS /HTML5 timeline editing visualisation tool.

Dependencies
------------

Uses the webpack, babel compiler and few other bit and pieces to make webpack handle 
other assets.

Builds are done through 'npm run-script build'

Dependencies are managed with npm.


Getting Started
---------------

Make sure you have a node environment, I recommend at least node V5.8 so
the npx command is available.

If you don't want to or can't install a recent version on node, but have 
reasonably up to date version of python you can use nodeenv.

.. code:: bash

    virtualenv env
    . env/bin/activate
    pip install nodeenv
    nodeenv -p              #Can take a long time
    npm i


All the deliverables are build into dist/

A demo page of the built application is on my website at http://backslashat.org/timeline/html/timeline.html 


TODO
----

Add lots of CSS to make the forms look pretty.
Allow relative setting f the end, and references of the end value of
other events.
Fix save bug with relative events created the UI.
