# forvo-light

A lightweight web/android client to forvo.com.

A precompiled apk: http://gromnitsky.users.sourceforge.net/android/apk/ <br>
A live example (see *Usage* section below): http://gromnitsky.users.sourceforge.net/js/forvo-light/

<img src='http://ultraimg.com/images/2017/04/18/0xrM.png'>

## Requirements

* Node 6.x
* `npm i -g browserify babel babel-preset-es2015`
* GNU Make

## Compilation

An out of tree build:

~~~
$ git clone ...
$ mkdir _out && cd _out
$ make -f ../forvo-light/main.mk
~~~

Then copy `src/` dir where your webserver expects static files.

## Android

Because I have a silly requirement of using the app on ancient devices
w/ Android 2.3, you can build the app only if you

* `npm i -g cordova@4.3.0`
* use a Node version manager,
  like [nodever](https://github.com/gromnitsky/nodever), for old
  versions of Cordova don't work w/ modern versions of Node;
* edit `../forvo-light/main.mk` to make sure that Cordova is being run
  under Node 4.8.

After this preliminaries, type:

	make -f ../forvo-light/main.mk cordova

It'll take a while, for Cordova will download a bunch of staff in
`~/.cordova` at its 1st run. The resulting apks should be in
`cordova/platforms/android/ant-build/`.

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

* no HTTPS support for `Audio()`
* `history.replaceState()` doesn't modify `location.hash`
* `error` event in `Audio()` doesn't get fired in cases of 404,
  invalid format, etc.
* `Date.prototype.getHours()` returns an UTC hour instead of the local
  value.

## License

MIT.

The icon: https://openclipart.org/detail/227474/pirate-parrot
