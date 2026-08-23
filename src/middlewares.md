# Middleware

Gustav middleware follows PSR-15. A middleware can inspect or replace the
request before a controller runs, short-circuit the request with its own
response, and inspect or replace the response on the way back out.

```php
use GustavPHP\Gustav\Middleware\Base;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class TimingMiddleware extends Base
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        $startedAt = hrtime(true);
        $response = $handler->handle($request);

        return $response->withHeader(
            'Server-Timing',
            'app;dur=' . ((hrtime(true) - $startedAt) / 1_000_000),
        );
    }
}
```

## Controller and route middleware

Attach middleware to a controller to run it for every route in that class.
Attach it to a route method for one endpoint. The attribute is repeatable and
takes a middleware class name. Gustav compiles this metadata when routes are
registered and resolves the middleware through the application container for
each request.

```php
use GustavPHP\Gustav\Attribute\Middleware;

#[Middleware(RequireApiKey::class)]
class DogsController extends Controller\Base
{
    #[Route('/dogs')]
    #[Middleware(TimingMiddleware::class)]
    public function list(): array
    {
        return [];
    }
}
```

Middleware runs in this order on the way in:

1. Application-wide middleware
2. Controller middleware
3. Route middleware

Responses pass back through the same middleware in reverse order.

## Application-wide middleware

Mark middleware that should wrap every request with `#[GlobalMiddleware]`.
Gustav discovers it from the application's `Middlewares` namespace:

```php
use GustavPHP\Gustav\Attribute\GlobalMiddleware;
use GustavPHP\Gustav\Middleware\Base;

#[GlobalMiddleware(priority: -100)]
final class SecurityHeadersMiddleware extends Base
{
    // ...
}
```

Lower priorities run earlier on the way in and later on the way out.
Application-wide middleware is resolved through the service container without
entrypoint registration.

Gustav creates and validates the request ID before application-wide middleware
runs. Inject `GustavPHP\Gustav\Http\RequestId` when middleware needs it; do not
add a separate request-ID middleware. Every response already receives the
canonical `X-Request-ID` header.

## Injecting middleware dependencies

Middleware can constructor-inject services just like controllers:

```php
use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Middleware\Base;

final class RequireApiKey extends Base
{
    public function __construct(
        private readonly ApiKeyVerifier $keys,
    ) {
    }

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        $this->keys->verify($request->getHeaderLine('X-API-Key'));

        return $handler->handle($request);
    }
}

#[Service(as: ApiKeyVerifier::class)]
final class DatabaseApiKeyVerifier implements ApiKeyVerifier
{
    // ...
}
```

Application-wide middleware is request-scoped by default. Set `lifetime:` on
`#[GlobalMiddleware]` when a transient or singleton instance is intentional.
Controller and route middleware classes are also autowired once per request
unless an advanced programmatic definition overrides their lifetime.

## Request-only middleware

Existing Gustav middleware using `handle()` remains supported. It can modify
the request or return a Gustav `Controller\Response` to stop the pipeline.

```php
class RequestContextMiddleware extends Middleware\Base
{
    public function handle(ServerRequestInterface $request): ServerRequestInterface
    {
        return $request->withAttribute('locale', 'en');
    }
}
```

A short-circuit response ends only the current request. The RoadRunner worker
continues serving later requests.
