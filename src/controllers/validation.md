# Validation

Request validation is achieved by the arguments itself. If a argument for `Body` and `Query` has no default value, its required.

```php
#[Route('/some')]
public function get(
    #[Query('required')] string $required,
    #[Query('optional')] string $optional = 'default',
) {
}
```

The same goes for DTO.

```php
class SomeDto
{
    public string $required;
    public string $optional = 'default';
}
```

Additionaly you can use the `validate(...)` method of your controller for more granular validation.

In this example `$number` must be a value between 0 and 100:

```php
#[Route('/custom-validation')]
public function get(
    #[Query('number')] int $number
) {
    $this->validate([
        [$number, new GustavPHP\Gustav\Validation\General\Integer(min: 0, max: 10)]
    ]);
}
```
