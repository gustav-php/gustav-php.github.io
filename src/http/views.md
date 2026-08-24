# Views

Gustav renders native PHP templates without requiring a third-party template
engine. Return a `View` from any controller; extending `Controller\Base` is not
required:

```php
namespace App\Routes;

use GustavPHP\Gustav\Attribute\{Controller, Get};
use GustavPHP\Gustav\View;

#[Controller]
final readonly class HomeController
{
    #[Get]
    public function index(): View
    {
        return new View('home', [
            'title' => 'Gustav',
            'message' => 'Ready to build',
        ]);
    }
}
```

`home` resolves to `views/home.phtml` under the configured view directory. The
`.phtml` extension is optional in logical names. Absolute paths, parent
traversal, other extensions, unreadable files, and symlinks escaping the
configured directory are rejected.

View responses use status `200` and `Content-Type: text/html; charset=utf-8` by
default. Supply response metadata only when it differs:

```php
return new View(
    template: 'dogs/created',
    data: ['dog' => $dog],
    status: 201,
    headers: ['X-Resource-Type' => 'dog'],
);
```

## View data

An array exposes every key as a local template variable and remains available
as `$model`:

```php
// Controller
return new View('home', [
    'title' => 'Gustav',
]);
```

```php
<!-- views/home.phtml -->
<h1><?= $view->escape($title) ?></h1>
<p><?= $view->escape($model['title']) ?></p>
```

Array keys must be valid PHP variable names. Internal names such as `view` and
`model` are reserved and fail rendering instead of being silently overwritten.

For non-trivial pages, prefer an immutable view model. The object is exposed as
`$model`, preserving constructor types and IDE support:

```php
namespace App\Views;

final readonly class HomeView
{
    public function __construct(
        public string $title,
        public string $message,
    ) {
    }
}
```

```php
use App\Views\HomeView;
use GustavPHP\Gustav\View;

return new View('home', new HomeView(
    title: 'Gustav',
    message: 'Ready to build',
));
```

```php
<?php
/** @var \GustavPHP\Gustav\View\Template $view */
/** @var \App\Views\HomeView $model */
?>

<h1><?= $view->escape($model->title) ?></h1>
<p><?= $view->escape($model->message) ?></p>
```

## Escaping and trusted HTML

Native PHP cannot automatically intercept `echo`. Escape every dynamic value
with `escape()` or its `e()` alias:

```php
<h1><?= $view->escape($title) ?></h1>
<input value="<?= $view->e($value) ?>">
```

The helper supports strings, numbers, booleans, null, backed enums, and
`Stringable` objects. It uses UTF-8 HTML escaping with quotes and invalid-byte
substitution. Arrays and unsupported objects fail explicitly.

Use `raw()` only for HTML that the application already trusts. Never pass
unvalidated request or database content to it:

```php
<?= $view->raw('<strong>Known application markup</strong>') ?>
```

Static HTML written directly in a template is trusted application code.
`section()` and `partial()` return rendered HTML and can be echoed directly.

Use the same escaping helper for a generated CSRF token in state-changing
forms:

```php
<input type="hidden" name="_token" value="<?= $view->escape($csrfToken) ?>">
```

Generate the value with the injected `CsrfTokenManager` and protect the target
route with `#[Csrf]`. See [Sessions and CSRF](../security/sessions-and-csrf.md#protecting-routes-from-csrf).

## Layouts and sections

Declare a layout from a page template. Output from the page becomes the
layout's `content` section:

```php
<!-- views/home.phtml -->
<?php $view->layout('layout', ['title' => $model->title]) ?>

<h1><?= $view->escape($model->title) ?></h1>
```

```php
<!-- views/layout.phtml -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= $view->escape($title) ?></title>
</head>
<body>
    <?= $view->section('content') ?>
</body>
</html>
```

Layouts can themselves declare another layout. Circular layout chains are
rejected.

Capture additional named sections with `start()` and `end()`:

```php
<?php $view->start('sidebar') ?>
    <nav>...</nav>
<?php $view->end() ?>
```

Render one in the layout with an escaped fallback:

```php
<aside><?= $view->section('sidebar', 'No navigation') ?></aside>
```

An unclosed section or an unexpected output-buffer change fails rendering and
Gustav restores the buffers it opened.

## Partials

Partials receive their own data and rendering context:

```php
<?php foreach ($dogs as $dog): ?>
    <?= $view->partial('components/dog', ['dog' => $dog]) ?>
<?php endforeach ?>
```

```php
<!-- views/components/dog.phtml -->
<article><?= $view->escape($dog->name) ?></article>
```

Sections and layouts cannot leak between partials or later RoadRunner requests.
Recursive partial chains are rejected.

## Optional controller helper

`Controller\Base::view()` remains available when a controller already uses the
base response helpers. It creates the same `View` object:

```php
public function index(): View
{
    return $this->view('home', ['title' => 'Gustav']);
}
```

New controllers can return `new View(...)` directly and remain plain classes.

## Replacing the renderer

`ViewRendererInterface` separates controller responses from the native PHP
renderer. Define one discovered singleton service to integrate Twig or another
engine. Application service discovery replaces Gustav's default automatically;
no `$app->...` setup is needed:

```php
namespace App\Services;

use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Service\Lifetime;
use GustavPHP\Gustav\View;
use GustavPHP\Gustav\View\ViewRendererInterface;

#[Service(
    as: ViewRendererInterface::class,
    lifetime: Lifetime::Singleton,
)]
final class ProjectViewRenderer implements ViewRendererInterface
{
    public function render(View $view): string
    {
        // Delegate $view->template and $view->data to the chosen engine.
        return '';
    }
}
```

Keep singleton renderers free of request-specific mutable state. A renderer
returns only the HTML body; Gustav applies the status, headers, request ID, and
HEAD behavior from the `View` response.

## Failure behavior

Missing templates, invalid paths, cycles, template exceptions, and renderer
failures are unexpected server errors. Development mode renders the framework's
debug page. Production returns the same safe JSON `500` used for other internal
exceptions and never exposes template names or paths. The failed request is
isolated and the RoadRunner worker continues serving subsequent requests.
