# Events

Event listeners extend `Event\Base`:

```php
use GustavPHP\Gustav\Event;

class TestEvent extends Event\Base
{
}
```

Attach `#[Event]` to select the dispatched event name:

```php
use GustavPHP\Gustav\Attribute\Event;
use GustavPHP\Gustav\Event;

#[Event('test')]
class TestEvent extends Event\Base
{
    public function handle(Event\Payload $payload): void
    {
        $data = $payload->getData();

        // React to the event payload.
    }
}
```

Dispatch an event with its payload data:

```php
GustavPHP\Gustav\Event\Manager::dispatch('test', [
    'key' => 'value',
]);
```

Listeners under the application's `Events` namespace are discovered during
startup. Event listeners are created without constructor dependencies. Put
logging and other injected infrastructure in the service that dispatches the
event; inject `Psr\Log\LoggerInterface` there instead of relying on a static
event logging helper.
