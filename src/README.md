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

Create and run a project with Composer:

```bash
composer create-project gustav-php/starter example-app
cd example-app
php gustav dev
```

Continue with [Installation](./getting-started/installation.md) for the local
requirements and then build your
[first endpoint](./getting-started/first-endpoint.md).
