# First endpoint

With the development server running, create
`src/Routes/HelloController.php`:

```php
<?php

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

Open `http://localhost:4201/hello` or request it from the terminal:

```bash
curl http://localhost:4201/hello
```

The endpoint returns JSON:

```json
{
	"message": "Hello, world!"
}
```

Continue with [Project Structure](./project-structure.md) to see where
application files belong, or read [Controllers](../http/controllers.md) for
the complete controller API.
