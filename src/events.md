## Events

All events must extend the `Events\Base` class.

```php
use GustavPHP\Gustav\Events;

class TestEvent extends Events\Base
{
}
```

Events can be defined by attaching the Event Attributes to a class.

```php
use GustavPHP\Gustav\Attribute\Event;
use GustavPHP\Gustav\Event;

#[Event('test')]
class TestEvent extends Event\Base
{
    public function handle(Event\Payload $payload): void
    {
        $this->log('Event: ' . $payload->getEvent());
    }
}
```

Events can be dispatched from anywhere using.

```php
GustavPHP\Gustav\Event\Manager::dispatch('test', [
    'key' => 'value'
]);
```

Events are automatically added like Routes in the `App\Events` namespace.
