# Configuration

Configure the application when constructing it in `app/index.php`.

```php
$configuration = new Configuration(
    mode: \GustavPHP\Gustav\Mode::Production,
    namespace: __NAMESPACE__,
    cache: __DIR__ . '/../cache/',
    files: __DIR__ . '/../public/',
    views: __DIR__ . '/../views/',
    eventNamespaces: [],
    routeNamespaces: [],
    serializerNamespaces: [],
);
```

| **Key**                | **Description**                                         |
| ---------------------- | ------------------------------------------------------- |
| `mode`                 | Sets the application in development or production.      |
| `namespace`            | Sets the application namespace for class discovery.     |
| `cache`                | Absolute path to the directory used for cache.          |
| `files`                | Absolute path to the directory used for static assets.  |
| `views`                | Absolute path to the directory used for view templates. |
| `eventNamespaces`      | Namespace for all additional Event classes.             |
| `routeNamespaces`      | Namespace for all additional Route classes.             |
| `serializerNamespaces` | Namespace for all additional Serializer classes.        |

Construct the application, register services and application middleware, and
then start request handling. Service registration is frozen by the first call
to `handle()` or `start()`.

```php
$app = new Application($configuration);

$app->services()
    ->bind(UserRepository::class, SqlUserRepository::class);

$app->addMiddleware(RequestIdMiddleware::class);
$app->start();
```

The `Configuration` object is also registered as an application singleton, so
services can constructor-inject it when they need framework configuration.
