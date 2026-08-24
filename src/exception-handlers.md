# Exception handlers

Application exception handlers turn domain failures into deliberate HTTP
responses without registration code in the entrypoint. Put an invokable class
under `App\ExceptionHandlers`, mark it with `#[ExceptionHandler]`, and type its
single parameter as the exception it handles:

```php
namespace App\Exceptions;

use RuntimeException;

final class OrderNotFound extends RuntimeException
{
    public function __construct(public readonly string $orderId)
    {
        parent::__construct("Order {$orderId} was not found");
    }
}
```

```php
namespace App\ExceptionHandlers;

use App\Exceptions\OrderNotFound;
use GustavPHP\Gustav\Attribute\ExceptionHandler;
use GustavPHP\Gustav\Controller\{Response, ResponseFormat};

#[ExceptionHandler]
final readonly class OrderNotFoundHandler
{
    public function __invoke(OrderNotFound $exception): Response
    {
        return new Response(
            status: 404,
            body: [
                'error' => [
                    'status' => 404,
                    'message' => 'Order not found',
                    'orderId' => $exception->orderId,
                ],
            ],
            format: ResponseFormat::Json,
        );
    }
}
```

No `$app->...` call is required. Gustav compiles handler metadata at startup
and resolves only the selected handler when a request throws its exception.

## Handler contract

A handler must:

- be an instantiable class with exactly one `#[ExceptionHandler]` attribute;
- declare a public, non-static `__invoke()` method;
- accept exactly one ordinary, non-nullable parameter typed as an exception
  class or `Throwable`;
- return a non-null `Controller\Response`, PSR-7 `ResponseInterface`, or
  `View`.

Gustav rejects invalid signatures during startup. Parameters cannot use scalar,
union, nullable, variadic, by-reference, or intermediate interface types;
`Throwable` itself is the only supported interface target. Returns cannot be
arrays, DTOs, scalars, unions, or nullable values.

Controller routes can infer a `200` JSON response from an array or DTO, but an
exception response needs an intentional status. Requiring an explicit response
object keeps the status, headers, format, and public error body in one place.

All three response forms use their normal behavior:

```php
namespace App\ExceptionHandlers;

use App\Exceptions\{CheckoutUnavailable, MaintenanceWindow};
use GustavPHP\Gustav\Attribute\ExceptionHandler;
use GustavPHP\Gustav\View;
use Nyholm\Psr7\Response as Psr7Response;
use Psr\Http\Message\ResponseInterface;

#[ExceptionHandler]
final readonly class MaintenanceWindowHandler
{
    public function __invoke(MaintenanceWindow $exception): ResponseInterface
    {
        return new Psr7Response(503, ['Retry-After' => '60']);
    }
}

#[ExceptionHandler]
final readonly class CheckoutUnavailableHandler
{
    public function __invoke(CheckoutUnavailable $exception): View
    {
        return new View('checkout-unavailable', status: 503);
    }
}
```

`View` responses use the configured application renderer. See
[Responses](./controllers/response.md) and [Views](./views.md) for the response
APIs.

## Discovery and dependency injection

Discovery is recursive below the application's `ExceptionHandlers` namespace.
Nested module folders are valid, and ordinary unmarked classes are ignored.

Handlers use normal constructor injection. They are created lazily in the
active request scope, so services such as `ServerRequestInterface`, `RequestId`,
typed configuration, and application services refer to the current request:

```php
use App\Exceptions\RateLimitExceeded;
use GustavPHP\Gustav\Attribute\ExceptionHandler;
use GustavPHP\Gustav\Controller\Response;
use GustavPHP\Gustav\Http\RequestId;

#[ExceptionHandler]
final readonly class RateLimitExceededHandler
{
    public function __construct(private RequestId $requestId)
    {
    }

    public function __invoke(RateLimitExceeded $exception): Response
    {
        return new Response(
            status: 429,
            headers: [
                'Retry-After' => (string) $exception->retryAfter,
                'X-Request-ID' => (string) $this->requestId,
            ],
        );
    }
}
```

Modular applications can add namespaces through shared configuration:

```php
use GustavPHP\Gustav\Configuration;

return Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    exceptionHandlerNamespaces: [
        'Module\Billing\ExceptionHandlers',
    ],
);
```

Do not repeat the conventional namespace in this list; duplicate class
discovery is ignored, but the extra entry is unnecessary.

## Matching order

Gustav chooses one handler in this order:

1. The exact thrown exception class
2. The nearest registered parent exception class
3. An optional `Throwable` fallback

This allows one broad domain handler with more specific overrides. Two handlers
for the same exception type are ambiguous and stop startup with an error naming
both classes.

A `Throwable` handler is a last-resort application fallback. Without one,
unmatched exceptions use Gustav's regular production-safe `500` response.

## Built-in request errors

`HttpException` and its subclasses always bypass application handlers, even
when a `Throwable` fallback exists. This preserves framework-owned statuses,
headers, and structured request-input responses:

- malformed JSON remains `400`;
- unsupported body media types remain `415`;
- type and validation violations remain `422`;
- authentication, authorization, CSRF, routing, and explicit
  `HttpException` responses keep their existing behavior.

A handler targeting `HttpException` or one of its subclasses is rejected at
startup. Use `HttpException` directly for protocol-level failures; use an
application handler when a domain exception should stay independent of HTTP.

## Middleware, logging, and failure safety

Domain exceptions from controllers and their middleware are mapped before the
response unwinds through application-wide middleware. That middleware can
inspect or amend the mapped response just like a successful response. See
[Middleware](./middlewares.md#mapped-error-responses).

The mapped response status controls automatic reporting:

- mapped `4xx` responses are not logged automatically;
- mapped `5xx` responses report the original domain exception exactly once.

The body returned by an application handler is intentionally public. Keep it
safe for clients and do not include credentials, internal exception messages,
queries, or stack details.

If handler construction, invocation, view rendering, or response conversion
fails, Gustav does not run another handler. It logs that new failure, returns
the regular production-safe `500`, releases the request scope, and continues
serving later RoadRunner requests.

## Testing handlers

Test the real application in process; no RoadRunner process or handler
registration is needed:

```php
use GustavPHP\Gustav\Application;
use Nyholm\Psr7\ServerRequest;

$application = new Application($configuration);
$response = $application->handle(new ServerRequest('GET', '/orders/missing'));

expect($response->getStatusCode())->toBe(404)
    ->and(json_decode((string) $response->getBody(), true))->toMatchArray([
        'error' => ['message' => 'Order not found'],
    ]);
```

Startup tests should also construct the application when they need to verify
duplicate targets or invalid signatures.
