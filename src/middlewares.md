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
Attach it to a route method for one endpoint. The attribute is repeatable.

```php
use GustavPHP\Gustav\Attribute\Middleware;

#[Middleware(new RequestIdMiddleware())]
class DogsController extends Controller\Base
{
    #[Route('/dogs')]
    #[Middleware(new TimingMiddleware())]
    public function list(): Controller\Response
    {
        return $this->json([]);
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
$app->addMiddleware(new RequestIdMiddleware());
```

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
