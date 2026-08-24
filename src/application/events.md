# Typed events

Events are ordinary PHP objects. They carry typed application facts without a
framework base class, string name, or untyped payload array.

```php
namespace App\Events;

final readonly class UserRegistered
{
    public function __construct(
        public int $userId,
        public string $email,
    ) {
    }
}
```

Readonly event objects are the preferred style when listeners should only
observe what happened. An event may be mutable when its contract deliberately
allows listeners to record a result or stop further processing.

## Define a listener

Add `#[Listener]` to an invokable class. Gustav infers the event type from the
single `__invoke()` parameter and injects constructor dependencies normally.

```php
namespace App\Events;

use App\Services\WelcomeMailer;
use GustavPHP\Gustav\Attribute\Listener;

#[Listener]
final readonly class SendWelcomeEmail
{
    public function __construct(private WelcomeMailer $mailer)
    {
    }

    public function __invoke(UserRegistered $event): void
    {
        $this->mailer->send($event->userId, $event->email);
    }
}
```

A listener must be instantiable and declare one public, non-static
`__invoke()` method with:

- exactly one non-null event class or interface parameter
- no scalar, union, or intersection event type
- no variadic or by-reference event parameter
- an explicit `void` return type

Invalid listener signatures fail application startup.

## Dispatch an event

Inject the standard PSR-14 `EventDispatcherInterface` into a controller,
service, middleware, command, or another listener:

```php
use Psr\EventDispatcher\EventDispatcherInterface;

final readonly class RegisterUser
{
    public function __construct(
        private UserRepository $users,
        private EventDispatcherInterface $events,
    ) {
    }

    public function register(string $email): User
    {
        $user = $this->users->create($email);
        $this->events->dispatch(new UserRegistered($user->id, $user->email));

        return $user;
    }
}
```

Dispatch returns the same event object. Dispatching an event with no matching
listeners is a no-op and does not throw.

## Discovery

Gustav recursively discovers `#[Listener]` classes under the application's
`Events` namespace. Ordinary event objects in the same namespace are ignored.
No listener registry or bootstrap call is required.

Modules can add listener namespaces through the shared project configuration:

```php
Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    eventNamespaces: ['Module\Billing\Events'],
);
```

Listeners may type their parameter as a concrete event, parent class, or
interface. Every compatible listener receives the event.

## Priority and stopping propagation

Listeners with a higher priority run first. Equal priorities use the listener
class name as a deterministic tie-breaker. Prefer independent listeners and
use priority only when ordering is part of the event contract.

```php
#[Listener(priority: 100)]
final readonly class CheckImportPermission
{
    public function __invoke(BeforeUserImport $event): void
    {
        if (!$event->allowed) {
            $event->stop();
        }
    }
}
```

Implement PSR-14's `StoppableEventInterface` when an event supports stopping
later listeners:

```php
use Psr\EventDispatcher\StoppableEventInterface;

final class BeforeUserImport implements StoppableEventInterface
{
    private bool $stopped = false;

    public function __construct(public readonly bool $allowed)
    {
    }

    public function stop(): void
    {
        $this->stopped = true;
    }

    public function isPropagationStopped(): bool
    {
        return $this->stopped;
    }
}
```

An event already marked as stopped invokes no listeners.

## Scope and failures

The dispatcher and discovered listeners use the active execution scope. A
listener and its scoped dependencies are created at most once during one HTTP
request or application command, even when several matching events are
dispatched. The scope is released afterward, so listener state cannot leak to
the next RoadRunner request or command.

Do not inject the scoped dispatcher into a singleton service. Dispatch from a
scoped service, controller, middleware, command, or listener instead.

Dispatch is synchronous. A listener exception stops dispatch and propagates to
the surrounding request or command boundary. HTTP requests use Gustav's normal
safe error response and logging pipeline; commands use the normal safe failure
message and exit code. Events do not provide queues, retries, or background
execution.
