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

Controllers do not need to extend a framework class. Extend `Controller\Base`
only when its HTML, redirect, or explicit response helpers make a handler
clearer:

```php
use GustavPHP\Gustav\Attribute\{Controller, Get};
use GustavPHP\Gustav\Controller\{Base, Response};

#[Controller]
final class HomeController extends Base
{
    #[Get]
    public function index(): Response
    {
        return $this->view('home.latte');
    }
}
```

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

See [Routing](./routing.md), [Request input](./request.md),
[Validation](./validation.md), and [Responses](./response.md) for the complete
controller API.

## Discovery and startup

Gustav discovers `#[Controller]` classes recursively in the `Routes` namespace
below the configured application namespace. Additional namespaces can be
listed in `routeNamespaces`.

```php
use GustavPHP\Gustav\{Configuration, Mode};

return new Configuration(
    mode: Mode::Production,
    namespace: 'App',
    cache: __DIR__ . '/../cache',
    routeNamespaces: [
        'Shared\\Http\\Routes',
    ],
);
```

Gustav compiles an immutable route table, request binder, response handler, and
middleware list once during application startup. Duplicate or ambiguous paths,
duplicate names, invalid placeholders, non-public handlers, and invalid input
or response signatures fail before the server begins accepting requests.
