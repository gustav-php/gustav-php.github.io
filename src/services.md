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
Move scalar settings into [typed configuration](./configuration.md), then
inject that configuration into the service that needs it.

Circular dependencies and unresolvable constructor parameters produce
configuration errors that identify the affected service chain.

## Third-party objects with factories

Use a discovered factory when an object must be constructed with scalar
configuration or library-specific setup. One invokable factory produces one
service:

```php
use GustavPHP\Gustav\Attribute\Factory;
use GustavPHP\Gustav\Service\Lifetime;

#[Factory(lifetime: Lifetime::Singleton)]
final readonly class DatabaseFactory
{
    public function __construct(private DatabaseConfig $configuration)
    {
    }

    public function __invoke(): PDO
    {
        return new PDO($this->configuration->url);
    }
}
```

Place the class under the application `Services` namespace. Gustav autowires
the factory constructor and uses the non-nullable `__invoke()` return type as
the product's service identifier. In this example, any controller or service
can inject `PDO` directly. The factory class itself does not need to be
registered or injected.

Factory products are lazy: Gustav constructs and invokes the factory only when
`PDO` is first requested. The selected lifetime belongs to the returned
product, not the short-lived factory object. `Lifetime::Scoped` is the default;
choose `Singleton` only when the object and all of its dependencies are safe to
share across requests and commands.

Gustav validates factory declarations during startup. A factory must be an
instantiable class with exactly one `#[Factory]` attribute and a public,
non-static, zero-argument `__invoke()` method. Its return type must be one
existing, non-nullable class or interface; scalar, union, and intersection
return types are rejected. A factory cannot also be a `#[Service]` or service
provider.

Attributed registrations are deterministic. Two factories for the same
product, two services for the same identifier, or a service and factory for the
same identifier stop startup with an error naming both declarations. A single
application factory may still replace a framework default, such as
`LoggerInterface` or `ViewRendererInterface`.

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

Singleton services and factory products are created outside any execution
scope. They cannot resolve scoped services, preventing a singleton from
accidentally retaining the first request, user, or command state for the
lifetime of a process.

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

Prefer injecting the specific dependency a class needs. Declarative factories
also use constructor injection and do not receive the container in
`__invoke()`.

See [Logging and request IDs](./logging.md) for writing PSR-3 records,
correlating them with requests, and replacing the default logger through
service discovery.

The default session store is a singleton. A discovered singleton
`#[Service(as: SessionStoreInterface::class)]` replaces it before requests are
handled, while `Session` and `CsrfTokenManager` remain isolated to the active
request. See [Sessions and CSRF](./sessions.md#storage-and-deployment).

## Service providers

Factories cover the normal third-party integration case. Keep a discovered
service provider for application composition that is genuinely dynamic, such
as choosing between implementations at startup:

```php
use GustavPHP\Gustav\Service\{Container, Provider};

final class InfrastructureProvider implements Provider
{
    public function register(Container $services): void
    {
        $services->singleton(
            PaymentClient::class,
            function (Container $services): PaymentClient {
                $configuration = $services->get(PaymentConfig::class);

                return $configuration->sandbox
                    ? new SandboxPaymentClient($configuration->key)
                    : new LivePaymentClient($configuration->key);
            },
        );
    }
}
```

Place providers under the application `Services` namespace. Gustav discovers
them and calls `register()` during startup. Providers must have a public
zero-argument constructor.

The registry exposes `bind()`, `singleton()`, `scoped()`, and `transient()` for
dynamic application composition. Providers run after attributed services and
factories, making them the explicit low-level override layer. The registry is
frozen before request or command handling begins.

Application configuration does not require a provider or a singleton service
marker. Define a `#[Config]` readonly class and inject it directly; Gustav
hydrates and registers it before factories and providers run. See
[Configuration](./configuration.md) for environment conversion, validation,
defaults, and test overrides.
