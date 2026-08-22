# Application services

Controllers, middleware, and services use the same constructor-injection
container. Services are ordinary PHP classes; they do not need to extend a
framework base class.

```php
interface DogRepository
{
    public function findAll(): array;
}

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

Register application services after constructing `Application` and before
calling `handle()` or `start()`:

```php
use GustavPHP\Gustav\Service\Container;

$app = new Application($configuration);

$app->services()
    ->singleton(PDO::class, function (Container $services): PDO {
        $database = $services->get(DatabaseConfiguration::class);

        return new PDO($database->dsn, $database->username, $database->password);
    })
    ->bind(DogRepository::class, SqlDogRepository::class);
```

`bind()` connects an interface or abstract class to a concrete implementation.
Its default lifetime is request-scoped. A factory may accept no arguments or
the active `Container`; invalid factory signatures are rejected during
registration.

The container is frozen when request handling begins. Registering another
service after the first request is an application configuration error.

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

| Registration  | Lifetime                                                                      |
| ------------- | ----------------------------------------------------------------------------- |
| `singleton()` | One instance for the application process, shared by every RoadRunner request. |
| `request()`   | One instance during a request, released even when that request fails.         |
| `transient()` | A new instance on every resolution.                                           |
| `bind()`      | Request-scoped unless a different `Lifetime` is passed.                       |

```php
use GustavPHP\Gustav\Service\Lifetime;

$services = $app->services();

$services
    ->singleton(DatabaseConfiguration::class, $databaseConfiguration)
    ->request(RequestContext::class)
    ->transient(CommandHandler::class)
    ->bind(
        Cache::class,
        RedisCache::class,
        Lifetime::Singleton,
    );
```

Only `singleton()` accepts an existing object. Request and transient services
must use an autowired class or factory so the container can create the correct
number of instances.

Singleton factories run outside any request scope. They cannot resolve
request-scoped services, preventing a singleton from accidentally retaining
the first request or user for the lifetime of a RoadRunner worker.

## Request-aware services

The current `ServerRequestInterface` is available inside the request scope:

```php
use Psr\Http\Message\ServerRequestInterface;

final readonly class RequestContext
{
    public function __construct(
        public ServerRequestInterface $request,
    ) {
    }
}

$app->services()->request(RequestContext::class);
```

Gustav automatically provides these framework services:

- `Application` and `Configuration` as singletons
- `ServerRequestInterface` for the active request
- `Service\Container`, resolving to the active scope

Prefer injecting the specific dependency a class needs. Inject the container
itself mainly in service factories or infrastructure that genuinely performs
dynamic service lookup.
