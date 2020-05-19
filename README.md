# Perils of Thunder Girl

This is a short one-room interactive fiction game written a few
years ago. It is pure Javascript with no extra dependencies,
although it uses Grunt to manage the development process.

The game contains no explicit adult scenes or content, but
the initial idea was to develop this into an adult game with
plenty of sex and BDSM themes. The game as presented contains
none of those elements and no more sexyness than some 80s
comic covers. Even then, you may consider the subject matter
distasteful or kinky, so consider yourself warned.

The game is currently playable at the following address:
https://thunder-girl.org/tg/index.html

The source code is reasonably split between the engine and
the game itself, and multiple games can be developed just
creating more folders inside ./games. There were originally
a few other test things there, but they are long gone.
However, the engine has no documentation and its feature set
grew with the game, so its usefullness is limited. In any
case, here's a brief & incomplete description:

The engine is reminiscent of some 80s like The Quill by
Gilsoft: adventures are built from one or more 'modules'
which contain stuff such as a response table, a list of
locations, objects, variables, and a vocabulary. Modules
can also expand the game offering certain functions which
will be run at several points during order parsing, such
'before' (any order) or 'afterDescription'. The 'buried.js'
module is older and was written before the response table
concept was added to the engine so it mostly uses this to
process player orders.

The game uses a canvas for everything, including player
input, which is a terrible idea and makes it incompatible
with tablets. But that's part of the retro feeling. The
font is something I wrote in some MS-DOS software 20
years ago (!) and using it required some stupid efforts,
including an MS-DOS code conversion table.

I've decided to distribute this under the permissive MIT
license, so feel free to use it in any way you want. I have
no plans to develop the engine any further and there is no
documentation, so I don't think it could be very useful.

I eventually ported the engine to Typescript and wrote a
sequel game, which I also plan to release as open source.

## Running the game

	npm install
	npx grunt

