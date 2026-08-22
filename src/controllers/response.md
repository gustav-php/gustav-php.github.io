# Response

Every route declares exactly one response type. Gustav and PSR-7 response objects pass through unchanged; any other supported declared type is serialized as JSON. Gustav compiles that decision when the route is registered.

## Typed JSON

Return a DTO, array, scalar, backed enum, or nullable value directly. No response marker is required:

```php
use GustavPHP\Gustav\Attribute\Route;

final readonly class DogOutput
{
    public function __construct(
        public int $id,
        public string $name,
    ) {
    }
}

#[Route('/dogs/{id}')]
public function show(): DogOutput
{
    return new DogOutput(42, 'Rex');
}
```

Gustav returns status `200`, supplies `Content-Type: application/json`, and recursively normalizes the value. See [Serialization](./serialization.md) for supported values, readonly DTOs, enums, exclusions, and failure behavior.

## HTML

Use `html()` to return HTML content:

```php
#[Route('/html')]
public function index(): Controller\Response
{
    return $this->html('<h1>Hello World!</h1>');
}
```

## JSON helper

Use `json()` when the body is selected dynamically or the response needs a non-default status or custom headers:

```php
use GustavPHP\Gustav\Router\Method;

#[Route('/dogs', Method::POST)]
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
use Nyholm\Psr7\Response;
use Psr\Http\Message\ResponseInterface;

#[Route('/accepted')]
public function accepted(): ResponseInterface
{
    return new Response(202, ['Content-Type' => 'text/plain'], 'accepted');
}
```

## HTTP errors

Throw `HttpException` when application code intentionally needs an HTTP error status and optional headers:

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

Do not encode an HTTP status in a generic exception's numeric code. Only typed `HttpException` instances control the response status; an unexpected exception such as `new RuntimeException('failure', 422)` is still a `500`.

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

Serialization failures, including circular references and unsupported output values, follow this same rule. They never expose DTO class names, property paths, or internal exception messages in production.
