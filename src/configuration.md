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
    serializerNamespaces: []
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
