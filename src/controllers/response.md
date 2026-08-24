# Response

Every route declares exactly one response type. Gustav and PSR-7 response
objects pass through unchanged, `View` responses render as HTML, and other
supported declared types are serialized as JSON. Gustav compiles that decision
with the route table during startup.

## Typed JSON

Return a DTO, array, scalar, backed enum, or nullable value directly. No response marker is required:

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
status and headers. See [Views](../views.md) for typed view models, escaping,
layouts, partials, and renderer replacement.

The remaining convenience helpers on this page are protected methods supplied
by the optional `Controller\Base` class.

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

## Legacy serializer

Existing `Serializer\Base` classes can still use `serialize()`:

```php
return $this->serialize(new Dog());
```

New code should prefer returning plain readonly output DTOs directly. Both APIs use the same serialization pipeline.

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

## HTTP errors

Throw `HttpException` when application code intentionally needs a
protocol-level HTTP error status and optional headers:

```php
use GustavPHP\Gustav\Http\Exception\HttpException;

throw new HttpException(
    404,
    'Dog not found',
    ['X-Error-Code' => 'DOG_NOT_FOUND'],
);
```

In production this becomes:

```json
{
	"error": {
		"status": 404,
		"message": "Dog not found"
	}
}
```

Authentication exceptions use this mechanism for `401` and `403` responses.
CSRF rejection is also a typed `403` request error with the stable message
`CSRF token is invalid`.

Do not encode an HTTP status in a generic exception's numeric code. Only typed `HttpException` instances control the response status; an unexpected exception such as `new RuntimeException('failure', 422)` is still a `500`.

Use a discovered [application exception handler](../exception-handlers.md) when
a domain exception should map to an HTTP response without coupling the domain
class to `HttpException`. Handlers must return an explicit response object so
the error status is always deliberate. Built-in `HttpException` and request
input responses bypass application handlers.

## Request ID header

Every response receives `X-Request-ID`, including short-circuit middleware
responses and mapped `4xx` or `5xx` errors. Gustav preserves one safe incoming
ID and generates a replacement when it is missing or unsafe. Inject the typed
`GustavPHP\Gustav\Http\RequestId` when application code needs the same value.

See [Logging and request IDs](../logging.md) for the accepted ID format and log
correlation.

## Request input errors

Gustav uses three statuses for request binding:

| Status | Meaning                                                                                      |
| ------ | -------------------------------------------------------------------------------------------- |
| `400`  | Malformed request syntax, including invalid JSON                                             |
| `415`  | A raw body has an unsupported media type                                                     |
| `422`  | Well-formed input cannot satisfy required fields, PHP types, enum cases, or validation rules |

A validation response contains every detected field violation:

```json
{
	"error": {
		"status": 422,
		"message": "Validation failed",
		"violations": [
			{
				"source": "body",
				"path": "email",
				"code": "invalid_email",
				"message": "Email is invalid"
			},
			{
				"source": "body",
				"path": "age",
				"code": "min_value",
				"message": "Value must be greater than or equal to 0"
			}
		]
	}
}
```

`source` identifies `body`, `query`, `param`, `header`, `cookie`, or controller-side validation. Nested paths use dot notation. Messages attached to expected request errors are safe to show to clients.

Malformed JSON has no field violations:

```json
{
	"error": {
		"status": 400,
		"message": "Malformed JSON body"
	}
}
```

Typed request-input exceptions use this JSON format in both development and production.

## Unexpected exceptions

Production responses never expose unexpected exception messages, class names, files, or traces:

```json
{
	"error": {
		"status": 500,
		"message": "Server Error"
	}
}
```

Development mode keeps the debug page for unexpected exceptions and regular `HttpException` instances. A failed request is isolated to that request; the RoadRunner worker continues serving subsequent requests.

Application exception handlers may deliberately return a public error body for
a domain failure. If a handler itself fails, Gustav uses this same safe
unexpected-exception response and never recursively invokes another handler.

Every `5xx` is reported once through `Psr\Log\LoggerInterface` with the request
ID, method, path, status, and exception. Expected `4xx` responses remain quiet
unless application code logs them explicitly.

Serialization failures, including circular references and unsupported output values, follow this same rule. They never expose DTO class names, property paths, or internal exception messages in production.
