# forvo-light

A lightweight web-client to forvo.com.

## Requirements

* Node 6.x
* `npm i -g browserify babel`
* GNU Make

## Compilation

An out of tree build:

~~~
$ git clone ...
$ mkdir _out && cd _out
$ make -f ../forvo-light/main.mk
~~~

Then copy `src/` dir where your webserver expects static files.

## Usage

You'll need to obtain an API key from Forvo. After the 1st run of the
app, click on the 'gear' icon & enter the api key. The app will
remember it in the `localStorage`.

## Implementation notes

No web frameworks were used in the making of this app. You won't
believe this, but it's still possible in 2017 to write simple programs
w/o React or Angular.

## Android 2.3.4 bugs

(Not that anybody cares)

* `history.replaceState()` doesn't modify `location.hash`
* `error` event in `Audio()` doesn't get fired in cases of 404,
  invalid format, etc.

## License

MIT.
