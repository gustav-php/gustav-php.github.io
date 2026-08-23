# Request input

Controller arguments can bind directly to an HTTP request. Add one input attribute to each argument and declare the PHP type Gustav should produce. Route signatures are checked when the application compiles its route table, and their binding metadata is reused for every request.

| Attribute     | Input                    |
| ------------- | ------------------------ |
| `#[Body]`     | Parsed form or JSON body |
| `#[Query]`    | Query string             |
| `#[Param]`    | Route placeholder        |
| `#[Header]`   | Request header           |
| `#[Cookie]`   | Cookie                   |
| `#[Request]`  | PSR-7 server request     |
| `#[AuthUser]` | Authenticated identity   |

## PSR-7 request

Use `#[Request]` when a handler needs the complete request instead of a bound value:

```php
use GustavPHP\Gustav\Attribute\{Get, Request};
use Psr\Http\Message\ServerRequestInterface;

#[Get('/dogs')]
public function list(#[Request] ServerRequestInterface $request): Controller\Response
{
    return $this->json([
        'method' => $request->getMethod(),
        'query' => $request->getQueryParams(),
    ]);
}
```

The parameter must accept `ServerRequestInterface` or a compatible parent interface.

## Binding one value

Pass a key or name to bind one value from a source:

```php
use GustavPHP\Gustav\Attribute\{Body, Cookie, Header, Param, Post, Query};

#[Post('/dogs/{id}')]
public function update(
    #[Param('id')] int $id,
    #[Query('notify')] bool $notify,
    #[Header('If-Match')] string $version,
    #[Cookie('locale')] string $locale,
    #[Body('name')] string $name,
): Controller\Response {
    // All values have already been converted to their declared PHP types.
    return $this->json(compact('id', 'notify', 'version', 'locale', 'name'));
}
```

The PHP argument name does not need to match the external name. In the example, `#[Header('If-Match')] string $version` binds the `If-Match` header to `$version`.

Omit the key to receive the complete source as an array:

```php
use GustavPHP\Gustav\Attribute\{Cookie, Get, Header, Query};

#[Get('/dogs')]
public function list(
    #[Query] array $query,
    #[Header] array $headers,
    #[Cookie] array $cookies,
): Controller\Response {
    return $this->json(compact('query', 'headers', 'cookies'));
}
```

`#[Param] array $params` similarly returns all route placeholders, while `#[Body] array $body` returns the complete parsed body.

## Required, optional, and nullable values

A keyed argument without a PHP default is required. Give the argument a default to make omission valid:

```php
use GustavPHP\Gustav\Attribute\{Get, Query};

#[Get('/dogs')]
public function list(
    #[Query('page')] int $page = 1,
    #[Query('archived')] bool $archived = false,
): Controller\Response {
    // If either key is absent, PHP supplies its declared default.
}
```

Omission and `null` are different states. A nullable type permits an explicit `null`, but it is still required unless it also has a default:

```php
#[Body('nickname')] ?string $nickname,        // required; null is accepted
#[Body('note')] ?string $note = null,         // optional; omission uses null
#[Body('name')] string $name,                 // required; null is rejected
```

Missing required input, disallowed `null`, and conversion failures produce a structured `422` response instead of reaching the controller.

## Type conversion

Gustav converts only the following request types. It rejects ambiguous unions such as `int|string` when compiling the route.

| PHP type    | Accepted input                                          |
| ----------- | ------------------------------------------------------- |
| `string`    | A string                                                |
| `int`       | An integer or valid integer string, including `"0"`     |
| `float`     | A finite integer, float, or numeric string              |
| `bool`      | `true`, `false`, `1`, `0`, or the corresponding strings |
| `array`     | An array                                                |
| `?T`        | The values accepted by `T`, plus explicit `null`        |
| backed enum | A valid value of its string or integer backing type     |

Conversion is deterministic: arrays are not coerced to strings, arbitrary objects are not cast, and invalid enum values are rejected.

## Constructor-based DTOs

Use a constructor-promoted, readonly DTO for a body or query object. Constructor defaults become input defaults, and the constructor runs only after every field has converted and validated successfully.

```php
enum DogSize: string
{
    case Small = 'small';
    case Medium = 'medium';
    case Large = 'large';
}

final readonly class CreateDogInput
{
    public function __construct(
        public string $name,
        public int $age,
        public bool $vaccinated,
        public DogSize $size,
        public ?string $nickname,
        public string $breed = 'mixed',
    ) {
    }
}
```

Bind the DTO from either source:

```php
use GustavPHP\Gustav\Attribute\{Body, Get, Post, Query};

#[Post('/dogs')]
public function create(#[Body] CreateDogInput $input): Controller\Response
{
    return $this->json([
        'name' => $input->name,
        'age' => $input->age,
        'vaccinated' => $input->vaccinated,
        'size' => $input->size->value,
        'nickname' => $input->nickname,
        'breed' => $input->breed,
    ], 201);
}

#[Get('/dogs')]
public function list(#[Query] DogSearchInput $input): Controller\Response
{
    // Query-string scalar values are converted before construction.
}
```

Input names must match constructor parameter names. Unknown fields are rejected by default, required constructor parameters must be present, and omitted parameters with defaults retain those defaults. Supported DTO field types are the same scalar, array, nullable, and backed-enum types listed above. Nested DTO collections are not inferred; bind them as arrays and map them explicitly.

Zero-argument DTOs with typed, declared public properties are also supported. Constructor-promoted readonly DTOs are the canonical style because they remain valid immutable objects from the moment they are created. Gustav never creates dynamic properties.

These are input contracts: Gustav hydrates them from client data and reports conversion failures as `422` responses. Returned output DTOs use a separate serialization contract; see [Serialization](./serialization.md).

See [Validation](./validation.md) for attaching rules to DTO fields.

## JSON and form bodies

`#[Body]` first uses a parsed body supplied by the PSR-7 server. If no parsed body exists, Gustav can read:

- `application/json`
- any `application/*+json` media type, such as `application/problem+json`
- `application/x-www-form-urlencoded`

Server-parsed multipart and regular form bodies continue to work. Reading a raw body preserves the position of a seekable PSR-7 stream.

Malformed JSON returns `400`. A non-empty raw body with an unsupported media type returns `415` when body binding is required. Syntactically valid JSON that cannot satisfy the declared PHP types returns `422`. See [Responses](./response.md#request-input-errors) for the JSON error format.
