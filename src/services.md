# Application services

Controllers, middleware, and services use the same constructor-injection
container. Services are ordinary PHP classes; they do not need to extend a
framework base class.

```php
use GustavPHP\Gustav\Attribute\Service;

interface DogRepository
{
    public function findAll(): array;
}

#[Service(as: DogRepository::class)]
final class SqlDogRepository implements DogRepository
{
    public function __construct(private readonly PDO $database)
    {
    }

    public function findAll(): array
    {
        // ...
    }
}
```

Gustav recursively discovers `#[Service]` classes under your application's
`Services` namespace. `as` connects an interface or abstract class to that
implementation. Request scope is the default, so no lifetime argument is
needed for most repositories and application services.

Concrete classes with the default request lifetime need no attribute at all;
Gustav autowires them when they are first requested. Use `#[Service]` when you
need an interface binding or a different lifetime.

## Constructor injection

Type-hint dependencies in a controller, middleware, or another service:

```php
final class DogsController extends Controller\Base
{
    public function __construct(
        private readonly DogRepository $dogs,
    ) {
    }

    #[Route('/dogs')]
    public function list(): array
    {
        return $this->dogs->findAll();
    }
}
```

Unregistered concrete classes are autowired and reused within the current
request. Interfaces and abstract classes require a binding. Constructor
parameters with scalar or ambiguous types must be supplied by a factory or
have a PHP default.

Circular dependencies and unresolvable constructor parameters produce
configuration errors that identify the affected service chain.

## Lifetimes

Choose a lifetime based on how long service state is safe to retain:

| Lifetime              | Behavior                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `Lifetime::Singleton` | One instance for the application process, shared by every RoadRunner request.              |
| `Lifetime::Request`   | One instance during a request, released even when that request fails. This is the default. |
| `Lifetime::Transient` | A new instance on every resolution.                                                        |

```php
use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Service\Lifetime;

#[Service(lifetime: Lifetime::Singleton)]
final class DatabaseConfiguration {}

#[Service(as: Cache::class, lifetime: Lifetime::Singleton)]
final class RedisCache implements Cache {}

#[Service(lifetime: Lifetime::Transient)]
final class CommandHandler {}
```

Singleton services are created outside any request scope. They cannot resolve
request-scoped services, preventing a singleton from accidentally retaining
the first request or user for the lifetime of a RoadRunner worker.

## Request-aware services

The current request and its validated request ID are available inside the
request scope:

```php
use GustavPHP\Gustav\Http\RequestId;
use Psr\Http\Message\ServerRequestInterface;

final readonly class RequestContext
{
    public function __construct(
        public ServerRequestInterface $request,
        public RequestId $requestId,
    ) {
    }
}
```

Gustav automatically provides these framework services:

- `Application` and `Configuration` as singletons
- `Psr\Log\LoggerInterface` as the default singleton logger
- `ServerRequestInterface` for the active request
- `Http\RequestId` for the active request
- `Service\Container`, resolving to the active scope

Prefer injecting the specific dependency a class needs. Inject the container
itself mainly in service factories or infrastructure that genuinely performs
dynamic service lookup.

See [Logging and request IDs](./logging.md) for writing PSR-3 records,
correlating them with requests, and replacing the default logger through
service discovery.

## Service providers

Discovery covers ordinary application classes. Use the programmatic registry
inside a discovered service provider when a dependency cannot be expressed as
an autowired class, such as a third-party object requiring scalar
configuration:

```php
use GustavPHP\Gustav\Service\{Container, Provider};

final class InfrastructureProvider implements Provider
{
    public function register(Container $services): void
    {
        $services->singleton(
            PDO::class,
            function (Container $services): PDO {
                $database = $services->get(DatabaseConfiguration::class);

                return new PDO(
                    $database->dsn,
                    $database->username,
                    $database->password,
                );
            },
        );
    }
}
```

Place providers under the application `Services` namespace. Gustav discovers
them and calls `register()` during startup, so the application entrypoint stays
declarative. Providers must have a public zero-argument constructor.

The registry exposes `bind()`, `singleton()`, `request()`, and `transient()` for
dynamic application composition. It is frozen when request handling begins.
