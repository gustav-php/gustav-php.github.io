# Validation

Request binding enforces presence, nullability, and PHP types before a controller runs. Add repeatable `#[Validate]` attributes for domain rules such as ranges, lengths, email addresses, or URLs. Conversion and rule violations from all fields are collected into one `422` response.

## Required input

A controller argument is required unless it has a PHP default:

```php
#[Route('/dogs')]
public function list(
    #[Query('owner')] string $owner,
    #[Query('page')] int $page = 1,
): Controller\Response {
}
```

Here, `owner` is required and `page` is optional. A nullable type accepts explicit `null`; it does not make omission valid by itself. The same rules apply to DTO constructor parameters.

## Rules on controller arguments

Place `#[Validate]` next to the input-source attribute. Rules receive the converted PHP value:

```php
use GustavPHP\Gustav\Attribute\{Query, Route, Validate};
use GustavPHP\Gustav\Validation\Common\{Email, Integer};

#[Route('/dogs')]
public function list(
    #[Query('owner')]
    #[Validate(new Email())]
    string $owner,
    #[Query('page')]
    #[Validate(new Integer(min: 1, max: 100))]
    int $page = 1,
): Controller\Response {
}
```

The attribute is repeatable:

```php
use GustavPHP\Gustav\Validation\Common\{Email, Text};

#[Query('email')]
#[Validate(new Text(maxLength: 254))]
#[Validate(new Email())]
string $email,
```

Rules run only for values supplied by the request. PHP defaults are trusted as part of the controller declaration.

## Rules on DTO fields

Attach rules to promoted constructor parameters:

```php
use GustavPHP\Gustav\Attribute\Validate;
use GustavPHP\Gustav\Validation\Common\{Email, Integer, Nullable, Text};

final readonly class RegisterInput
{
    public function __construct(
        #[Validate(new Text(maxLength: 254))]
        #[Validate(new Email())]
        public string $email,
        #[Validate(new Text(minLength: 12, maxLength: 128))]
        public string $password,
        #[Validate(new Integer(min: 0, max: 150))]
        public int $age,
        #[Validate(new Nullable(new Email()))]
        public ?string $recoveryEmail = null,
    ) {
    }
}

#[Route('/register', Method::POST)]
public function register(#[Body] RegisterInput $input): Controller\Response
{
    // The DTO is fully converted and valid here.
}
```

Wrap a rule in `Nullable` when the rule should be skipped for `null`.

## Built-in rules

Rules live in `GustavPHP\Gustav\Validation\Common`:

| Rule                         | Constraint                                               |
| ---------------------------- | -------------------------------------------------------- |
| `Boolean`                    | Boolean values and their `true`/`false` or `1`/`0` forms |
| `Decimal(min, max)`          | Finite decimal value in an inclusive range               |
| `Email`                      | Valid email address                                      |
| `Integer(min, max)`          | Integer value in an inclusive range                      |
| `IP(onlyV4, onlyV6)`         | IPv4, IPv6, or one selected version                      |
| `Nullable(rule)`             | Skip the wrapped rule for `null`                         |
| `Text(minLength, maxLength)` | String with inclusive length bounds                      |
| `URL`                        | Valid URL                                                |

`Integer` accepts both integer `0` and string `"0"`. `Decimal` accepts `0.0` and negative values; its default range is `-PHP_FLOAT_MAX` through `PHP_FLOAT_MAX`.

## Controller validation helper

Controllers can validate values assembled inside the handler with the existing `validate()` helper. Add an optional third tuple item to identify the field path:

```php
$this->validate([
    [$email, new Email(), 'email'],
    [$score, new Decimal(min: -2, max: 2), 'score'],
]);
```

The helper evaluates every entry and throws the same structured validation exception used by request binding. Its violations use `controller` as the source.

## Custom rules

Extend `Validation` and return a `RuleViolation` when the value is invalid:

```php
use GustavPHP\Gustav\Validation\{RuleViolation, Validation};

final class EvenNumber extends Validation
{
    public function getViolation(mixed $value): ?RuleViolation
    {
        if (is_int($value) && $value % 2 === 0) {
            return null;
        }

        return new RuleViolation('not_even', 'Value must be even');
    }
}
```

Safe rule messages are included in the client response. See [Request input errors](./response.md#request-input-errors) for the complete shape.
