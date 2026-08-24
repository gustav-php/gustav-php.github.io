# Responses

Every route declares exactly one response type. Gustav and PSR-7 response
objects pass through unchanged, `View` responses render as HTML, and other
supported declared types are serialized as JSON.

## Typed JSON

Return a DTO, array, scalar, backed enum, or nullable value directly:

```php
use GustavPHP\Gustav\Attribute\Get;

final readonly class DogOutput
{
    public function __construct(
        public int $id,
        public string $name,
    ) {
    }
}

#[Get('/dogs/{id}')]
public function show(): DogOutput
{
    return new DogOutput(42, 'Rex');
}
```

Gustav returns status `200`, supplies `Content-Type: application/json`, and recursively normalizes the value. See [Serialization](./serialization.md) for supported values, readonly DTOs, enums, exclusions, and failure behavior.

## Views

Return a `View` directly from a plain controller to render a native PHP
template:

```php
use GustavPHP\Gustav\View;

#[Get]
public function index(): View
{
    return new View('home', ['title' => 'Gustav']);
}
```

The response uses `text/html; charset=utf-8`. Views can also carry a custom
status and headers. See [Views](./views.md) for typed view models, escaping,
layouts, partials, and renderer replacement.

Controllers extending `Controller\Base` can use the following protected
response helpers.

## HTML

Controllers extending `Controller\Base` can use `html()` to return HTML content:

```php
#[Get('/html')]
public function index(): Controller\Response
{
    return $this->html('<h1>Hello World!</h1>');
}
```

## JSON helper

Use `json()` when the body is selected dynamically or the response needs a non-default status or custom headers:

```php
use GustavPHP\Gustav\Attribute\Post;

#[Post('/dogs')]
public function create(): Controller\Response
{
    return $this->json([
        'name' => 'Rex',
        'age' => 4,
    ], status: 201, headers: ['X-Resource-Type' => 'dog']);
}
```

## Plain text

Use `plaintext()` for a text response:

```php
return $this->plaintext('ready');
```

## XML

Use `xml()` for XML content:

```php
return $this->xml('<status>ready</status>');
```

## Redirect

Use `redirect()` with a destination and, optionally, a status:

```php
return $this->redirect('/dogs');
```

## PSR-7 response

A controller may return a PSR-7 response directly:

```php
use GustavPHP\Gustav\Attribute\Get;
use Nyholm\Psr7\Response;
use Psr\Http\Message\ResponseInterface;

#[Get('/accepted')]
public function accepted(): ResponseInterface
{
    return new Response(202, ['Content-Type' => 'text/plain'], 'accepted');
}
```

## Errors

See [Errors](./errors.md) for HTTP exceptions, request and validation errors,
production-safe `500` responses, and request IDs.
