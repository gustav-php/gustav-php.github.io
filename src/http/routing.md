# Routing

Mark a controller and give it a shared path prefix, then use concise HTTP
method attributes on its handlers:

```php
use GustavPHP\Gustav\Attribute\{Body, Controller, Delete, Get, Param, Patch, Post};

#[Controller('/dogs')]
final readonly class DogsController
{
    #[Get]
    public function list(): array
    {
        return [];
    }

    #[Post]
    public function create(#[Body] CreateDogInput $input): DogOutput
    {
        // ...
    }

    #[Patch('/{dog}')]
    public function update(#[Param('dog')] int $id): DogOutput
    {
        // ...
    }

    #[Delete('/{dog}')]
    public function delete(#[Param('dog')] int $id): bool
    {
        // ...
    }
}
```

`#[Get]`, `#[Post]`, `#[Put]`, `#[Patch]`, `#[Delete]`, `#[Head]`, and
`#[Options]` are available. The generic `#[Route]` attribute accepts a
`Router\Method` when a less common HTTP method is required.

The controller prefix and method path are joined. Both default to the root path,
so `#[Controller('/dogs')]` with `#[Get]` registers `GET /dogs`.

## Path parameters

Surround one complete path segment with braces and bind it with `#[Param]`:

```php
#[Get('/{dog}')]
public function show(#[Param('dog')] int $id): DogOutput
{
    return $this->dogs->find($id);
}
```

The external placeholder and PHP argument can have different names. Multiple
parameters work the same way:

```php
#[Get('/{dog}/collars/{collar}')]
public function collar(
    #[Param('dog')] int $dogId,
    #[Param('collar')] int $collarId,
): CollarOutput {
    // ...
}
```

Placeholder names must start with a letter or underscore and contain only
letters, numbers, and underscores. Unknown or repeated placeholders fail
startup. Static routes take precedence over parameter routes, so `/dogs/new`
is matched before `/dogs/{dog}`.

## Named routes and URL generation

Give a route a stable name and inject `UrlGeneratorInterface` wherever links or
redirects are built:

```php
use GustavPHP\Gustav\Attribute\{Controller, Get, Param};
use GustavPHP\Gustav\Router\UrlGeneratorInterface;

#[Controller('/dogs')]
final readonly class DogsController
{
    public function __construct(private UrlGeneratorInterface $urls)
    {
    }

    #[Get('/{dog}', name: 'dogs.show')]
    public function show(#[Param('dog')] int $id): DogOutput
    {
        // ...
    }

    #[Get('/featured')]
    public function featured(): array
    {
        return [
            'url' => $this->urls->generate(
                'dogs.show',
                ['dog' => 42],
                ['ref' => 'featured'],
            ),
        ];
    }
}
```

The generated value is `/dogs/42?ref=featured`. Path values are URL-encoded;
missing and unknown parameters throw immediately. Route names are unique across
the application and are validated during startup.

## HEAD, OPTIONS, and method errors

A `HEAD` request uses the matching `GET` handler when no explicit `#[Head]`
handler exists, then removes the response body while preserving its status and
headers. Gustav answers `OPTIONS` automatically with status `204` and an
`Allow` header unless the route declares an explicit `#[Options]` handler.

When a path exists for another method, Gustav returns `405` with every allowed
method, including inferred `HEAD` and `OPTIONS`. An unknown path returns `404`.

## Invalid routes

Gustav validates routes when the application starts. Startup fails when routes
contain:

- duplicate or ambiguous paths;
- duplicate route names;
- invalid or unknown placeholders;
- non-public handlers; or
- invalid request input or response types.
