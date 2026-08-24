# Philosophy

Hi, I'm [Torsten](https://github.com/TorstenDittmann), and I like to code. I'm not here to sell you the next big thing, but to share my perspective on current PHP frameworks and explain why I want to do things differently.

## The Overwhelming Maze

I guess many developers have been in these shoes, navigating the maze of PHP frameworks. Complex libraries, random features, inscrutable terminology and the feeling that the kitchen sink got thrown in for good measure. It can be a confusing landscape.

The big players like [Laravel](https://laravel.com) and [Symfony](https://symfony.com) are awesome, no doubt.

When it comes to developer experience, I think Laravel especially does a poor job. I should be able to navigate and discover a framework's namespaces and classes by following common sense and familiar naming patterns.

Within a minute of using Laravel, you encounter `Illuminate\Support\Facades\Route`, and this is only the beginning. How does that name help me create a route for a "Hello World!" endpoint? Its ecosystem is filled with terms such as `Illuminate`, `Eloquent`, and `Artisan` that add an unnecessary layer of complexity.

Of course, once you learn the conventions of Laravel, Symfony, and similar frameworks, you can build whatever you want at an _enterprise_ level.

But what if your project isn't an enterprise monolith? What if you want simplicity?

## Simplicity

I want to keep it lean. I'd rather give you a blank canvas and let you shape your project than a printer that comes with a manual.

Have you ever opened a framework's project scaffold only to find it sprouting 15 folders and more files than you can count? It's a recipe for overwhelm. GustavPHP starts you off with a clean slate, not a tangled mess of directories.

That also means this framework will not be a Swiss Army knife for every need. I don't see GustavPHP shipping with an ORM because excellent options already exist. I'd rather make it straightforward to use whichever one fits your project.

## No magic

We all enjoy a little magic, but not when it leaves us in the dark. Some frameworks operate with a touch of "magic" that can make a codebase feel like a mystery. That is probably why Ruby on Rails never hooked me. I value transparency and control. Your code should be a friend, not a stranger.

## Type safety

One aspect missing from many PHP frameworks is robust type safety. Modern PHP provides strong parameter, property, and return type declarations.

However, not all frameworks fully embrace these advancements.

Having to define some `random-string` on a setter method just to pass `random-string` again in a getter method somewhere else with a `mixed` return type tires me.

GustavPHP embraces those declarations so mistakes surface when the application starts instead of deep inside a request. This creates a more reliable and maintainable codebase.

## Modern PHP

Remember when you were stuck with whatever PHP version your hosting provider decided to throw your way? Those days are luckily over. With containerization tools like Docker, you get to call the shots.

The language has undergone a remarkable transformation, adding features such as [JIT compilation](https://php.watch/versions/8.0/JIT), [fibers](https://php.watch/versions/8.1/fibers), [match expressions](https://php.watch/versions/8.0/match-expression), and [attributes](https://php.watch/articles/php-attributes).

Parts of the ecosystem still support very old PHP versions and therefore cannot take advantage of newer language features. GustavPHP deliberately targets modern PHP.

## Final

GustavPHP is my personal take on PHP as a developer. I want to keep things simple, give you control, and embrace modern PHP. It is your project; GustavPHP should help you shape it.
