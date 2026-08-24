# Configuration

Gustav separates framework bootstrap settings from application settings. The
starter uses conventional project paths and reads `MODE` without mutable
application setup. `app/bootstrap.php` returns the configuration shared by the
HTTP worker and project CLI:

```php
use GustavPHP\Gustav\Configuration;

return Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
);
```

`Configuration::forProject()` selects `development` when `MODE` is absent and
accepts `MODE=development` or `MODE=production`. It configures these paths
relative to the supplied project root:

| Setting         | Conventional path   |
| --------------- | ------------------- |
| Static files    | `public/`           |
| Views           | `views/`            |
| Session storage | `storage/sessions/` |

## Typed application configuration

Put immutable configuration classes under your application's `Config`
namespace. Mark the class with `#[Config]` and map every constructor parameter
to an environment variable with `#[Env]`:

```php
namespace App\Config;

use GustavPHP\Gustav\Attribute\{Config, Env, Validate};
use GustavPHP\Gustav\Validation\Common\Integer;

enum DatabaseRole: string
{
    case Primary = 'primary';
    case Replica = 'replica';
}

#[Config]
final readonly class DatabaseConfig
{
    /** @param list<string> $replicas */
    public function __construct(
        #[Env('DATABASE_URL')]
        public string $url,
        #[Env('DATABASE_POOL_SIZE'), Validate(new Integer(min: 1, max: 100))]
        public int $poolSize = 10,
        #[Env('DATABASE_SSL')]
        public bool $ssl = true,
        #[Env('DATABASE_REPLICAS')]
        public array $replicas = [],
        #[Env('DATABASE_ROLE')]
        public DatabaseRole $role = DatabaseRole::Primary,
    ) {
    }
}
```

Gustav discovers and hydrates every `#[Config]` class before request handling
starts. Each object is registered as an application singleton, so controllers,
services, middleware, and service factories use ordinary constructor
injection:

```php
namespace App\Services;

use App\Config\DatabaseConfig;
use GustavPHP\Gustav\Attribute\Factory;
use GustavPHP\Gustav\Service\Lifetime;
use PDO;

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

No service binding or configuration lookup is required. See
[Third-party objects with factories](./services.md#third-party-objects-with-factories)
for the complete factory contract and lifetime rules.

## Conversion and optional values

Environment values are strings. Gustav converts them deterministically from
the declared constructor type:

| PHP type    | Accepted environment value                                   |
| ----------- | ------------------------------------------------------------ |
| `string`    | The value unchanged                                          |
| `int`       | A valid whole number, including `0` and negative values      |
| `float`     | A finite decimal number                                      |
| `bool`      | `true`, `false`, `1`, or `0`, case-insensitive               |
| `array`     | JSON that decodes to a PHP array                             |
| backed enum | An exact string backing value or valid integer backing value |

Nullable forms of these types are supported. Missing values follow PHP
constructor semantics:

- A parameter without a default is required, even when its type is nullable.
- An omitted parameter with a default keeps that default.
- Use `?string $value = null` when absence should resolve to `null`.
- An empty environment string is still a string; it is not treated as `null`.

Ambiguous unions and unsupported object types are rejected during startup
instead of being guessed at runtime. Arrays do not infer element types; validate
their contents inside application code when needed.

Repeatable `#[Validate(...)]` attributes use the same built-in validation rules
as request input. All type and rule failures across discovered configuration
classes are collected before Gustav throws one configuration exception.

## Environment files and secrets

`Configuration::forProject()` loads optional files from the project root in
this order:

1. `.env` provides safe, committed development defaults.
2. `.env.local` overrides those defaults for one machine and should be ignored
   by Git.
3. Real process environment variables override both files.

For example:

```dotenv
MODE=development
DATABASE_POOL_SIZE=10
DATABASE_SSL=true
DATABASE_REPLICAS='["postgres-replica.internal"]'
```

Use deployment environment variables for production secrets. Gustav never
includes the rejected raw value in its own startup diagnostics. Errors identify
the variable and target field so multiple problems can be fixed together:

```text
Application configuration is invalid:
- DATABASE_POOL_SIZE (App\Config\DatabaseConfig::$poolSize): Value must be integer
- DATABASE_URL (App\Config\DatabaseConfig::$url): Value is required
```

Configuration objects contain the resolved values by design. Do not dump or
log an entire configuration object when it contains credentials.

## Testing configuration

Use an isolated `Environment` instead of changing process-global variables in
tests:

```php
use GustavPHP\Gustav\Config\Environment;
use GustavPHP\Gustav\Configuration;

$configuration = Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    environment: Environment::fromArray([
        'MODE' => 'production',
        'DATABASE_URL' => 'sqlite::memory:',
    ]),
);
```

The supplied map is the complete test environment, which keeps tests
deterministic and prevents one test from leaking variables into another.

## Custom framework layout

Construct `Configuration` directly when the project does not use the
conventional directories:

```php
use GustavPHP\Gustav\{Configuration, Mode};
use GustavPHP\Gustav\Session\SessionOptions;

$configuration = new Configuration(
    mode: Mode::Production,
    namespace: 'App',
    files: '/srv/example/web/',
    views: '/srv/example/templates/',
    routeNamespaces: ['Module\Billing\Routes'],
    eventNamespaces: ['Module\Billing\Events'],
    serializerNamespaces: ['Module\Billing\Serializers'],
    serviceNamespaces: ['Module\Billing\Services'],
    middlewareNamespaces: ['Module\Billing\Middlewares'],
    configurationNamespaces: ['Module\Billing\Config'],
    commandNamespaces: ['Module\Billing\Commands'],
    exceptionHandlerNamespaces: ['Module\Billing\ExceptionHandlers'],
    session: new SessionOptions(directory: '/srv/example/var/sessions/'),
);
```

Direct construction reads real process variables for typed application
configuration. Pass an explicit `Environment` when another source is required.
The framework `Configuration` object itself remains injectable as a singleton.
Direct construction disables sessions unless `session` is supplied. See
[Sessions and CSRF](../security/sessions-and-csrf.md) for cookie options and custom shared stores.
