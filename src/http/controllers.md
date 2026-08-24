# Controllers

Controllers are ordinary constructor-injected PHP classes marked with
`#[Controller]`. Add an HTTP method attribute to each public handler. Supported
return values are serialized as JSON automatically:

```php
namespace App\Routes;

use GustavPHP\Gustav\Attribute\{Controller, Get};

#[Controller('/dogs')]
final readonly class DogsController
{
    public function __construct(private DogRepository $dogs)
    {
    }

    /** @return list<DogOutput> */
    #[Get]
    public function list(): array
    {
        return $this->dogs->findAll();
    }
}
```

Return a `View` directly for HTML templates:

```php
use GustavPHP\Gustav\Attribute\{Controller, Get};
use GustavPHP\Gustav\View;

#[Controller]
final readonly class HomeController
{
    #[Get]
    public function index(): View
    {
        return new View('home');
    }
}
```

The optional `Controller\Base` class remains useful when its HTML, redirect, or
explicit response helpers make a handler clearer.

Use `#[Post]`, `#[Put]`, `#[Patch]`, or `#[Delete]` for write endpoints. Typed
input attributes bind request data to handler arguments:

```php
use GustavPHP\Gustav\Attribute\{Body, Post};

#[Post]
public function create(#[Body] CreateDogInput $input): DogOutput
{
    return $this->dogs->create($input);
}
```

See [Routing](./routing.md), [Request input](./request-input.md),
[Validation](./validation.md), and [Responses](./responses.md) for the complete
controller API.

## Custom namespaces

Place controllers in the `Routes` namespace below the configured application
namespace. List controllers from shared packages or modules in
`routeNamespaces`:

```php
use GustavPHP\Gustav\{Configuration, Mode};

return new Configuration(
    mode: Mode::Production,
    namespace: 'App',
    routeNamespaces: [
        'Shared\\Http\\Routes',
    ],
);
```
