# Controllers

Controllers receive requests and return responses. Every controller extends `Controller\Base`, and public handler methods use `#[Route]`. Add `#[JsonResponse]` to return a typed JSON value directly:

```php
namespace App\Routes;

use GustavPHP\Gustav\Attribute\{JsonResponse, Route};
use GustavPHP\Gustav\Controller;

final class DogsController extends Controller\Base
{
    #[Route('/dogs')]
    #[JsonResponse]
    public function list(): array
    {
        return [
            ['name' => 'Rex', 'breed' => 'German Shepherd'],
        ];
    }
}
```

Pass a `Method` to register a non-GET route. Typed input attributes bind request data to handler arguments:

```php
use GustavPHP\Gustav\Attribute\{Body, JsonResponse, Route};
use GustavPHP\Gustav\Router\Method;

#[Route('/dogs', Method::POST)]
#[JsonResponse(status: 201)]
public function create(#[Body('name')] string $name): array
{
    return ['name' => $name];
}
```

See [Routing](./routing.md), [Request input](./request.md), [Validation](./validation.md), and [Responses](./response.md) for the complete controller API.

## Discovery and startup

Gustav discovers controller subclasses in the `Routes` namespace below the configured application namespace. Additional namespaces can be listed in `routeNamespaces`.

```php
use GustavPHP\Gustav\{Application, Configuration, Mode};

$configuration = new Configuration(
    mode: Mode::Production,
    namespace: 'App',
    cache: __DIR__ . '/../cache',
    routeNamespaces: [
        'Shared\\Http\\Routes',
    ],
);

$app = new Application($configuration);
$app->start();
```

Routes are reflected and validated once when the application starts. Invalid handler signatures fail during registration instead of becoming request-time errors.
