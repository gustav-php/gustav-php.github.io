# GustavPHP

![GustavPHP Logo](/logo.png)

GustavPHP is a typed PHP framework for APIs and server-rendered web
applications. Define endpoints with attributes, receive typed request data, and
return PHP values as JSON or render them with native PHP views.

```php
namespace App\Routes;

use GustavPHP\Gustav\Attribute\{Controller, Get};

#[Controller('/hello')]
final readonly class HelloController
{
    /** @return array{message: string} */
    #[Get]
    public function show(): array
    {
        return ['message' => 'Hello, world!'];
    }
}
```

Start with [Installation](./getting-started/installation.md) to create and run
a project, then build your
[first endpoint](./getting-started/first-endpoint.md).
