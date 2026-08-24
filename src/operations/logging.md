# Logging and request IDs

Constructor-inject `Psr\Log\LoggerInterface` wherever application code needs to
write a log. Inject `RequestId` when the record should correlate with an HTTP
request:

```php
use GustavPHP\Gustav\Http\RequestId;
use Psr\Log\LoggerInterface;

final class CreateDog
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly RequestId $requestId,
    ) {
    }

    public function handle(int $dogId): void
    {
        $this->logger->info('Dog created', [
            'request_id' => (string) $this->requestId,
            'dog_id' => $dogId,
        ]);
    }
}
```

The default logger writes one JSON object per line to `STDERR`. It implements
PSR-3, accepts the standard log levels, safely normalizes arbitrary context,
and includes structured exception details when an exception is supplied under
the `exception` key.

Do not write application output or logs to `STDOUT` while running a RoadRunner
worker. That stream carries the worker protocol. Gustav's default logger uses
`STDERR`, which RoadRunner collects.

## Automatic server-error reporting

Every exception that becomes a `5xx` response is reported exactly once in both
development and production. The record has this context:

```json
{
	"timestamp": "2026-08-23T10:15:30.123456Z",
	"level": "error",
	"message": "Request failed",
	"context": {
		"request_id": "01J5REQUEST123",
		"http.method": "POST",
		"http.path": "/dogs",
		"http.status_code": 500,
		"exception": {
			"class": "RuntimeException",
			"message": "Database unavailable",
			"code": 0,
			"file": "/app/src/Dogs/CreateDog.php",
			"line": 42,
			"trace": "..."
		}
	}
}
```

Expected `4xx` responses are not logged automatically. Gustav also does not
automatically capture query parameters, request bodies, headers, cookies,
identity data, or client IP addresses. Add application context deliberately
and avoid credentials, tokens, and personal data.

[Application exception handlers](../http/exception-handlers.md) follow the mapped
response status. A mapped `4xx` remains quiet; a mapped `5xx` reports the
original domain exception exactly once with the mapped status. If the handler
itself fails, Gustav reports that handler failure as a `500` and does not run a
fallback handler recursively.

Unexpected exception details remain hidden from production HTTP responses;
they are available to the logger instead. If an application logger throws
while Gustav is reporting a server failure, Gustav writes the record through
its built-in fallback logger.

Unexpected application-command exceptions use the same reporter. Their record
message is `Command failed` and the context contains `command` plus the
structured exception. Invalid command input is expected and is not logged.
Production console output never includes the unexpected exception details.

## Request IDs

Gustav creates one `RequestId` before application-wide middleware runs and
adds it to every response as `X-Request-ID`. An incoming ID is preserved only
when it is a single safe value matching this contract:

```text
[A-Za-z0-9][A-Za-z0-9._-]{0,127}
```

Missing, repeated, or unsafe values are replaced with a 32-character
lowercase hexadecimal ID. This prevents control characters and unbounded
values from reaching response headers or logs.

Inject the typed request-scoped value into controllers, middleware, or
services:

```php
use GustavPHP\Gustav\Http\RequestId;

final readonly class RequestContext
{
    public function __construct(public RequestId $requestId)
    {
    }
}
```

Middleware can also read it from the PSR-7 request using
`$request->getAttribute(RequestId::ATTRIBUTE)`.

## Replacing the logger

Register any PSR-3 implementation as a singleton service:

```php
use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Service\Lifetime;
use Psr\Log\{AbstractLogger, LoggerInterface};
use Stringable;

#[Service(as: LoggerInterface::class, lifetime: Lifetime::Singleton)]
final class ApplicationLogger extends AbstractLogger
{
    public function log(
        mixed $level,
        string|Stringable $message,
        array $context = [],
    ): void {
        // Forward to your logging backend.
    }
}
```

Use a [service factory](../application/services.md#third-party-objects-with-factories) when a
third-party logger needs typed configuration or library-specific setup. Keep a
logger singleton unless it intentionally depends on scoped state; add the
`RequestId` to ordinary application records explicitly when you need
correlation.

## RoadRunner production logging

RoadRunner maps PHP worker `STDERR` to its `server` logging channel at `info`
severity. Keep that channel enabled and use raw mode for the already-structured
application lines:

```yaml
logs:
    mode: production
    encoding: json
    level: info
    channels:
        server:
            mode: raw
            level: info
```

This keeps Gustav's newline-delimited JSON intact while RoadRunner can format
its own operational records as JSON. The starter project's `.rr.prod.yaml`
contains this setup.
