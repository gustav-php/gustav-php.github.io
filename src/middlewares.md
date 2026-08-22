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

#[Middleware(RequestIdMiddleware::class)]
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

Register middleware that should wrap every request on the application:

```php
$app = new Application($configuration);
$app->addMiddleware(RequestIdMiddleware::class);
```

Application-wide middleware is also resolved through the service container.

## Injecting middleware dependencies

Middleware can constructor-inject services just like controllers:

```php
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

$app->services()->bind(ApiKeyVerifier::class, DatabaseApiKeyVerifier::class);
```

Middleware uses its service registration lifetime. An unregistered middleware
class is autowired once per request. Register it with `transient()` to create a
fresh instance for each occurrence, or `singleton()` only when sharing that
instance between RoadRunner requests is intentional and safe.

## Request-only middleware

Existing Gustav middleware using `handle()` remains supported. It can modify
the request or return a Gustav `Controller\Response` to stop the pipeline.

```php
class RequestContextMiddleware extends Middleware\Base
{
    public function handle(ServerRequestInterface $request): ServerRequestInterface
    {
        return $request->withAttribute('request-id', bin2hex(random_bytes(8)));
    }
}
```

A short-circuit response ends only the current request. The RoadRunner worker
continues serving later requests.
