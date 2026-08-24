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

For session tests, reuse the `Set-Cookie` ID through `withCookieParams()` on a
later request. Point `SessionOptions` at an isolated temporary directory, or
register an in-memory `SessionStoreInterface` as a discovered singleton. This
exercises the same request-scoped session and CSRF middleware as RoadRunner.

RoadRunner remains the production transport used by `Application::run()`; the
request behavior is shared by both entry points.

## Configuration overrides

Create an isolated environment map when a test needs typed application
configuration. This avoids `putenv()` and prevents process-global state from
leaking between tests:

```php
use GustavPHP\Gustav\Config\Environment;

$configuration = Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    environment: Environment::fromArray([
        'DATABASE_URL' => 'sqlite::memory:',
        'FEATURE_ENABLED' => 'false',
    ]),
);

$app = new Application($configuration);
```

The normal startup path still runs, so missing variables, conversions,
defaults, backed enums, and `#[Validate]` rules behave exactly as they do in a
worker.

## Testing commands

Application commands run in process through Symfony's `ApplicationTester`:

```php
use Symfony\Component\Console\Tester\ApplicationTester;

$configuration = require dirname(__DIR__) . '/app/bootstrap.php';
$console = (new Application($configuration))->console();
$tester = new ApplicationTester($console);

$status = $tester->run([
    'command' => 'users:sync',
    'tenant' => 'acme',
    '--dry-run' => true,
]);

expect($status)->toBe(0);
```

The tester uses normal command discovery, typed input conversion, validation,
dependency injection, exception rendering, and scope cleanup without opening a
port. See [Application commands](./commands.md#testing-commands) for the full
example and exit-code contract.
