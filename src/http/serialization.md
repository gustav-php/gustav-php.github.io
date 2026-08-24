# Serialization

Gustav converts typed controller return values into a predictable JSON
representation before building the PSR-7 response.

## Typed JSON responses

Return a declared PHP value directly and Gustav serializes it as JSON. Constructor-promoted, readonly output DTOs are the canonical style:

```php
use GustavPHP\Gustav\Attribute\Get;

enum DogState: string
{
    case Available = 'available';
    case Adopted = 'adopted';
}

final readonly class OwnerOutput
{
    public function __construct(public string $name)
    {
    }
}

final readonly class DogOutput
{
    /** @param list<OwnerOutput> $watchers */
    public function __construct(
        public int $id,
        public string $name,
        public DogState $state,
        public ?string $nickname,
        public OwnerOutput $owner,
        public array $watchers,
    ) {
    }
}

#[Get('/dogs/{id}')]
public function show(): DogOutput
{
    return new DogOutput(
        id: 42,
        name: 'Rex',
        state: DogState::Available,
        nickname: null,
        owner: new OwnerOutput('Ada'),
        watchers: [new OwnerOutput('Grace')],
    );
}
```

The response has status `200`, content type `application/json`, and this body:

```json
{
	"id": 42,
	"name": "Rex",
	"state": "available",
	"nickname": null,
	"owner": { "name": "Ada" },
	"watchers": [{ "name": "Grace" }]
}
```

Direct JSON responses use status `200`. When a route needs a different status or custom headers, return a Gustav response through `json()`:

```php
use GustavPHP\Gustav\Attribute\Post;

#[Post('/dogs')]
public function create(): Controller\Response
{
    return $this->json(
        new DogOutput(/* ... */),
        status: 201,
        headers: ['X-Resource-Type' => 'dog'],
    );
}
```

Handlers must declare exactly one named return type. A non-null Gustav response or PSR-7 `ResponseInterface` passes through unchanged; every other supported type is inferred as JSON. Nullable types such as `?DogOutput` are accepted and serialize `null` as JSON `null`. Ambiguous unions, `mixed`, `object`, and `void` are rejected when routes are compiled.

## Supported values

The normalizer handles these values recursively:

| PHP value                        | JSON representation                                       |
| -------------------------------- | --------------------------------------------------------- |
| `null`, string, integer, boolean | Corresponding JSON primitive                              |
| finite float                     | JSON number; `1.0` remains `1.0`                          |
| array                            | Every key and value is normalized recursively             |
| backed enum                      | String or integer backing value                           |
| DTO                              | Initialized, non-static public properties                 |
| `JsonSerializable`               | Recursively normalized result of `jsonSerialize()`        |
| `stdClass`                       | Public properties, including properties added at run time |

Invalid UTF-8 in string values is replaced with the Unicode replacement character, so it cannot silently create an empty or invalid response.

Unbacked enums, closures, resources, non-finite floats, uninitialized public properties, unsupported internal objects, excessive nesting, and circular references cannot be represented. They are programming errors and become a production-safe `500`; they are not client validation errors.

## Excluding fields

All initialized public DTO properties are included by default. Add `#[Exclude]` to a declared property that must never be emitted:

```php
use GustavPHP\Gustav\Attribute\Serializer\Exclude;

final readonly class AccountOutput
{
    public function __construct(
        public string $name,
        #[Exclude]
        public string $internalToken,
    ) {
    }
}
```

Non-public and static properties are not serialized. Classes that intentionally
expose run-time dynamic properties must opt in with `#[AdditionalProperties]`:

```php
use AllowDynamicProperties;
use GustavPHP\Gustav\Attribute\Serializer\AdditionalProperties;

#[AllowDynamicProperties]
#[AdditionalProperties]
class ExtensibleOutput
{
    public string $name = 'Rex';
}
```

Use additional properties sparingly; declared readonly properties provide a clearer response contract.

## JSON helper

Use `json()` when a handler needs to choose its status or body at run time while still returning `Controller\Response`:

```php
use GustavPHP\Gustav\Attribute\Get;

#[Get('/dogs/{id}')]
public function show(): Controller\Response
{
    return $this->json(new DogOutput(/* ... */), status: 200);
}
```

The helper uses the same recursive normalizer, enum conversion, exclusions,
float handling, and error safety as a directly returned JSON value.
