# Testing

`Application` is a PSR-15 request handler. Tests can send a PSR-7 request
directly to the application without starting RoadRunner or opening a port.

```php
use Nyholm\Psr7\ServerRequest;

$app = new Application($configuration);
$response = $app->handle(new ServerRequest('GET', '/dogs'));

expect($response->getStatusCode())->toBe(200);
expect((string) $response->getBody())->toBe('{"dogs":[]}');
```

Set query, parsed-body, cookie, and request attributes with the regular PSR-7
methods before passing the request to `handle()`:

```php
$request = (new ServerRequest('POST', '/dogs'))
    ->withQueryParams(['notify' => 'true'])
    ->withParsedBody(['name' => 'Gustav'])
    ->withCookieParams(['session' => 'example']);

$response = $app->handle($request);
```

RoadRunner remains the production transport used by `Application::start()`;
the request behavior is shared by both entry points.
