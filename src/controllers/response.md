# Response

Every route must return either a Gustav controller response or a PSR-7 `ResponseInterface`.

## HTML

Use `html()` to return HTML content:

```php
#[Route('/html')]
public function index(): Controller\Response
{
    return $this->html('<h1>Hello World!</h1>');
}
```

## JSON

Use `json()` with an array or object:

```php
#[Route('/dogs')]
public function index(): Controller\Response
{
    return $this->json([
        'name' => 'Rex',
        'age' => 4,
    ]);
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

## Serialize

Use `serialize()` for a configured Gustav serializer:

```php
return $this->serialize(new Dog());
```

See [Serialization](./serialization.md) for serializer configuration.

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
