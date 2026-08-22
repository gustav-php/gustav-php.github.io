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
    serviceNamespaces: [],
    middlewareNamespaces: [],
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
| `serviceNamespaces`    | Namespace for additional `#[Service]` classes.          |
| `middlewareNamespaces` | Namespace for additional `#[GlobalMiddleware]` classes. |

Gustav automatically discovers routes, services, middleware, serializers, and
events from their conventional namespaces under the application namespace.
The additional namespace arrays are useful for modules outside that structure.

Construct the application and start request handling; ordinary projects do not
need imperative registration calls in their entrypoint:

```php
$app = new Application($configuration);
$app->start();
```

The `Configuration` object is also registered as an application singleton, so
services can constructor-inject it when they need framework configuration.
