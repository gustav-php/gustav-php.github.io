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
implementation. Execution scope is the default, so no lifetime argument is
needed for most repositories and application services.

Concrete classes with the default scoped lifetime need no attribute at all;
Gustav autowires them when they are first requested. Use `#[Service]` when you
need an interface binding or a different lifetime.

## Constructor injection

Type-hint dependencies in a controller, middleware, or another service:

```php
use GustavPHP\Gustav\Attribute\{Controller, Get};

#[Controller('/dogs')]
final readonly class DogsController
{
    public function __construct(
        private readonly DogRepository $dogs,
    ) {
    }

    #[Get]
    public function list(): array
    {
        return $this->dogs->findAll();
    }
}
```

Unregistered concrete classes are autowired and reused within the current HTTP
request or console command. Interfaces and abstract classes require a binding.
Constructor parameters with scalar or ambiguous types must be supplied by a
factory or have a PHP default.

Circular dependencies and unresolvable constructor parameters produce
configuration errors that identify the affected service chain.

## Lifetimes

Choose a lifetime based on how long service state is safe to retain:

| Lifetime              | Behavior                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `Lifetime::Singleton` | One instance for the application process, shared by every HTTP request and command.                     |
| `Lifetime::Scoped`    | One instance during an HTTP request or command, released after success or failure. This is the default. |
| `Lifetime::Transient` | A new instance on every resolution.                                                                     |

```php
use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Service\Lifetime;

#[Service(lifetime: Lifetime::Singleton)]
final class MetricsRegistry {}

#[Service(as: Cache::class, lifetime: Lifetime::Singleton)]
final class RedisCache implements Cache {}

#[Service(lifetime: Lifetime::Transient)]
final class PayloadEncoder {}
```

Singleton services are created outside any execution scope. They cannot resolve
scoped services, preventing a singleton from accidentally retaining the first
request, user, or command state for the lifetime of a process.

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

During HTTP requests, Gustav automatically provides these framework services:

- `Application` and `Configuration` as singletons
- `Psr\Log\LoggerInterface` as the default singleton logger
- `Router\UrlGeneratorInterface` for named application routes
- `View\ViewRendererInterface` for HTML view responses
- `ServerRequestInterface` for the active request
- `Http\RequestId` for the active request
- `Session` for lazy server-side request state
- `Security\CsrfTokenManager` for form and request tokens
- `Service\Container`, resolving to the active scope

Commands receive their own active scope with Symfony's input, output, and
`SymfonyStyle` services. See [Application commands](./commands.md) for the
complete command contract.

Prefer injecting the specific dependency a class needs. Inject the container
itself mainly in service factories or infrastructure that genuinely performs
dynamic service lookup.

See [Logging and request IDs](./logging.md) for writing PSR-3 records,
correlating them with requests, and replacing the default logger through
service discovery.

The default session store is a singleton. A discovered singleton
`#[Service(as: SessionStoreInterface::class)]` replaces it before requests are
handled, while `Session` and `CsrfTokenManager` remain isolated to the active
request. See [Sessions and CSRF](./sessions.md#storage-and-deployment).

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
                $database = $services->get(DatabaseConfig::class);

                return new PDO($database->url);
            },
        );
    }
}
```

Place providers under the application `Services` namespace. Gustav discovers
them and calls `register()` during startup, so the application entrypoint stays
declarative. Providers must have a public zero-argument constructor.

The registry exposes `bind()`, `singleton()`, `scoped()`, and `transient()` for
dynamic application composition. It is frozen before request or command
handling begins.

Application configuration does not require a provider or a singleton service
marker. Define a `#[Config]` readonly class and inject it directly; Gustav
hydrates and registers it before providers run. See
[Configuration](./configuration.md) for environment conversion, validation,
defaults, and test overrides.
