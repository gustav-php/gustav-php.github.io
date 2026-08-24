# Error handling

Gustav uses structured responses for expected HTTP and request errors. In
production, unexpected errors return a safe response without exception details.

## HTTP errors

Throw `HttpException` when an endpoint needs a specific HTTP status and
optional headers:

```php
use GustavPHP\Gustav\Http\Exception\HttpException;

throw new HttpException(
    404,
    'Dog not found',
    ['X-Error-Code' => 'DOG_NOT_FOUND'],
);
```

The production response is:

```json
{
	"error": {
		"status": 404,
		"message": "Dog not found"
	}
}
```

Authentication uses `401` and `403` errors. An invalid CSRF token returns a
typed `403` error with the message `CSRF token is invalid`.

A generic exception's numeric code does not control the HTTP status. Use an
[exception handler](./exception-handlers.md) when a domain exception should
produce a deliberate HTTP response.

## Request errors

Request binding uses three error statuses:

| Status | Meaning                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| `400`  | Malformed request syntax, including invalid JSON                                 |
| `415`  | A required raw body has an unsupported media type                                |
| `422`  | Input cannot satisfy required fields, PHP types, enum cases, or validation rules |

Malformed JSON has no field violations:

```json
{
	"error": {
		"status": 400,
		"message": "Malformed JSON body"
	}
}
```

## Validation errors

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

`source` identifies `body`, `query`, `param`, `header`, `cookie`, or
controller-side validation. Nested paths use dot notation. Messages on expected
request errors are safe to return to clients.

## Development and production

Error responses differ by mode only when a debug page is useful:

| Error                         | Development     | Production                       |
| ----------------------------- | --------------- | -------------------------------- |
| Request or validation error   | Structured JSON | Structured JSON                  |
| Regular `HttpException`       | Debug page      | Declared status and safe message |
| Unexpected exception or error | Debug page      | Safe `500` JSON                  |

## Unexpected errors

Production responses do not include unexpected exception messages, class
names, files, or traces:

```json
{
	"error": {
		"status": 500,
		"message": "Server Error"
	}
}
```

In production, every `5xx` is reported through `Psr\Log\LoggerInterface`;
expected `4xx` responses are not logged automatically. See
[Logging](../operations/logging.md) for the recorded context.

## Request IDs

Every response includes `X-Request-ID`. Gustav preserves a safe incoming ID or
generates one when the header is missing or invalid. Inject
`GustavPHP\Gustav\Http\RequestId` when application code needs the same value.

Use the request ID to correlate an error response with its
[log record](../operations/logging.md#request-ids).
