# Application commands

Application commands are plain invokable PHP classes. Place them under
`src/Commands` and add `#[Command]`:

```php
namespace App\Commands;

use App\Services\UserSynchronizer;
use GustavPHP\Gustav\Attribute\{Argument, Command, Option, Validate};
use GustavPHP\Gustav\Validation\Common\Integer;
use Symfony\Component\Console\Output\OutputInterface;

#[Command('users:sync', description: 'Synchronize users')]
final readonly class SyncUsers
{
    public function __construct(
        private UserSynchronizer $users,
        private OutputInterface $output,
    ) {
    }

    public function __invoke(
        #[Argument(description: 'Tenant identifier')]
        string $tenant,
        #[Option(shortcut: 'l', description: 'Maximum users to synchronize')]
        #[Validate(new Integer(min: 1, max: 1000))]
        int $limit = 100,
        #[Option('dry-run', description: 'Do not persist changes')]
        bool $dryRun = false,
    ): int {
        $count = $this->users->sync($tenant, $limit, $dryRun);
        $this->output->writeln("Synchronized {$count} users");

        return 0;
    }
}
```

Run or inspect the command with the project CLI:

```bash
php gustav users:sync acme --limit=250 --dry-run
php gustav list
php gustav help users:sync
```

Command classes may return an integer exit code or declare `void`. A `void`
command exits successfully with code `0`.

## Typed arguments and options

Every `__invoke()` parameter declares exactly one input attribute:

- `#[Argument]` reads a positional value.
- `#[Option]` reads a named option.

The PHP parameter name becomes the input name by default. Camel-case option
names are converted to kebab case, so `$dryRun` becomes `--dry-run`. Pass an
explicit name when the CLI contract should differ from the PHP name.

Command input uses the same conversion rules as HTTP input:

| PHP type    | Command input                                                       |
| ----------- | ------------------------------------------------------------------- |
| `string`    | The supplied text                                                   |
| `int`       | A valid whole number, including `0` and negative values             |
| `float`     | A finite decimal number                                             |
| `bool`      | A flag such as `--dry-run`; default-true flags support `--no-color` |
| `array`     | Repeated values such as `--tag=api --tag=stable`                    |
| backed enum | An exact string backing value or a valid integer backing value      |

Nullable forms are supported. Required and optional inputs follow the PHP
signature:

- A positional argument or value-taking option without a default is required.
- An omitted parameter with a default preserves that PHP default.
- Use `?string $format = null` when omission should resolve to `null`.
- Boolean options must declare a default: `false` creates a regular flag and
  `true` also enables its `--no-...` form.
- Nullable does not make a parameter optional without a PHP default.
- Ambiguous unions and unsupported object types fail during application boot.

Array element types are not inferred. DTO parameters are reserved for HTTP
input and are not accepted as command arguments or options.

## Validation and failures

Attach repeatable `#[Validate]` rules to arguments and options. Gustav converts
all supplied values, runs every rule, and reports the violations together:

```text
Invalid command input
  argument tenant [min_length] Value must contain at least 2 characters
  option --limit [max_value] Value must be less than or equal to 1000
```

The handler is not invoked when input is invalid. Command exit codes are:

| Code | Meaning                                           |
| ---- | ------------------------------------------------- |
| `0`  | Success                                           |
| `1`  | The command failed unexpectedly                   |
| `2`  | Invalid command syntax, conversion, or validation |

Unexpected application exceptions are logged with the command name. Production
console output says only `Command failed`; it does not expose the exception
message or trace. Each invocation receives its own command-scoped services.

## Constructor injection and scope

Command constructors use the same service container as controllers and
middleware. Inject application services, typed configuration, or
`Psr\Log\LoggerInterface` normally.

During a command, Gustav also provides:

- `Symfony\Component\Console\Input\InputInterface`
- `Symfony\Component\Console\Output\OutputInterface`
- `Symfony\Component\Console\Style\SymfonyStyle`
- the active `Service\Container`

Services using the default `Lifetime::Scoped` lifetime are created once for
the command and released afterward. Request-only values such as
`ServerRequestInterface` and `Http\RequestId` are available only while handling
HTTP requests.

## Project bootstrap and custom namespaces

Both the HTTP worker and project CLI use `app/bootstrap.php` as the single
configuration source:

```php
// app/bootstrap.php
use GustavPHP\Gustav\Configuration;

return Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
);
```

```php
// app/index.php
use GustavPHP\Gustav\Application;

Application::run(require __DIR__ . '/bootstrap.php');
```

`php gustav` loads the bootstrap automatically and discovers commands
recursively under `App\Commands`. Modular applications can add namespaces:

```php
Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    commandNamespaces: ['Module\Billing\Commands'],
);
```

## Testing commands

Use Symfony's `ApplicationTester` to run a command in process:

```php
use GustavPHP\Gustav\Application;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\ApplicationTester;

$configuration = require dirname(__DIR__) . '/app/bootstrap.php';
$tester = new ApplicationTester((new Application($configuration))->console());

$status = $tester->run([
    'command' => 'users:sync',
    'tenant' => 'acme',
    '--limit' => '25',
    '--dry-run' => true,
]);

expect($status)->toBe(Command::SUCCESS);
expect($tester->getDisplay())->toContain('Synchronized');
```

This path performs normal command discovery, dependency injection, conversion,
validation, exception handling, and scope cleanup.
