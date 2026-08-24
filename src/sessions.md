# Sessions and CSRF

Gustav provides lazy, server-side sessions for browser applications. A
conventional project stores them under `storage/sessions`; there is no session
registry call in the application entrypoint. Inject the request-scoped
`Session` service wherever state is needed:

```php
use GustavPHP\Gustav\Attribute\{Controller, Get};
use GustavPHP\Gustav\Session;

#[Controller('/account')]
final readonly class AccountController
{
    public function __construct(private Session $session)
    {
    }

    #[Get]
    public function show(): array
    {
        $visits = (int) $this->session->get('visits', 0) + 1;
        $this->session->put('visits', $visits);

        return ['visits' => $visits];
    }
}
```

Reading a missing value does not create a session. Gustav opens storage only
when an existing session is read, state is written, an ID is requested, or a
CSRF token is created. Untouched requests therefore create neither a storage
file nor a cookie.

## Session data

The session API covers ordinary values and destructive reads:

```php
$session->put('user_id', 42);
$session->put('filters', ['archived' => false]);

$userId = $session->get('user_id');
$exists = $session->has('user_id');
$removed = $session->remove('user_id');
$filters = $session->pull('filters', []);

$all = $session->all();
$session->clear();
```

Keys are names such as `user_id`, `checkout.step`, or `csrf-token`. Values can
contain `null`, booleans, integers, finite floats, UTF-8 strings, and arrays of
those values. Objects and resources are rejected instead of being serialized
implicitly. This keeps records portable between storage implementations and
prevents an object-unserialization boundary inside the request pipeline.

## Flash data

Flash data is available when the session is next opened and committed, then it
expires automatically:

```php
$session->flash('notice', 'Profile saved');

$notice = $session->getFlash('notice');
$notice = $session->pullFlash('notice');
```

Use `hasFlash()`, `allFlash()`, or `keepFlash('notice')` when a message needs to
survive another request. Calling `keepFlash()` without keys retains all current
flash entries.

An unexpected exception or `5xx` response does not commit session mutations or
consume loaded flash data. The storage lease is always released, so one failed
request cannot leave a RoadRunner worker holding the session lock.

## Regeneration and invalidation

Regenerate the opaque session ID after a privilege change such as login while
preserving the current values:

```php
$session->regenerate();
```

Invalidate the record on logout or when all state must be discarded:

```php
$session->invalidate();
```

Invalidation deletes the server-side record and returns an expired browser
cookie. The old ID no longer restores the session.

## Protecting routes from CSRF

Cookie-authenticated state-changing routes should declare `#[Csrf]`. Put it on
one handler or on a controller class:

```php
use GustavPHP\Gustav\Attribute\{Controller, Csrf, Post};

#[Controller('/account')]
#[Csrf]
final class AccountController
{
    #[Post('/email')]
    public function updateEmail(): array
    {
        // The token was checked before body binding and controller execution.
    }
}
```

Class-level protection applies only to unsafe HTTP methods. `GET`, `HEAD`,
`OPTIONS`, and `TRACE` remain unprotected; they must not change application
state. A protected route without session configuration fails during startup.

Generate a token through the injectable manager and escape it in a native PHP
form:

```php
use GustavPHP\Gustav\Security\CsrfTokenManager;

public function __construct(private CsrfTokenManager $csrf)
{
}

return new View('account/edit', [
    'csrfToken' => $this->csrf->token(),
]);
```

```php
<form method="post" action="/account/email">
    <input
        type="hidden"
        name="_token"
        value="<?= $view->escape($csrfToken) ?>"
    >
    <!-- fields -->
    <button type="submit">Save</button>
</form>
```

Gustav accepts the same token in `X-CSRF-Token`, which is convenient for JSON
and JavaScript requests:

```js
await fetch("/account/email", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"X-CSRF-Token": csrfToken,
	},
	body: JSON.stringify({ email: "ada@example.com" }),
});
```

The hidden `_token` field is removed before `#[Body]` binding, so it is not an
unknown DTO field and is not passed to controller input. A missing or invalid
token returns a safe JSON `403`:

```json
{
	"error": {
		"status": 403,
		"message": "CSRF token is invalid"
	}
}
```

When Gustav must parse the body to find `_token`, malformed JSON still returns
`400` and a non-empty unsupported body returns `415`. Supplying the header lets
CSRF validation happen without requiring body parsing.

## Cookie and lifetime configuration

Conventional projects use an HTTP-only, `SameSite=Lax` cookie named
`gustav_session`, scoped to `/`, with a two-hour lifetime. `Secure` is enabled
automatically for HTTPS requests. Override the options in the shared project
configuration only when the application needs a different policy:

```php
use GustavPHP\Gustav\Configuration;
use GustavPHP\Gustav\Session\{SameSite, SessionOptions};

return Configuration::forProject(
    namespace: 'App',
    root: dirname(__DIR__),
    session: new SessionOptions(
        directory: dirname(__DIR__) . '/storage/sessions',
        cookieName: '__Host-session',
        lifetime: 3600,
        secure: true,
        sameSite: SameSite::Strict,
    ),
);
```

`SameSite=None` and cookie names using the `__Secure-` prefix require
`secure: true`. A `__Host-` cookie additionally requires path `/` and no cookie
domain. Invalid combinations fail when configuration is created.

Pass `session: null` when constructing `Configuration` directly to disable
sessions. `Configuration::forProject()` enables the conventional file store.

## Storage and deployment

The default store uses one file per opaque ID and an exclusive lease while the
session is open. It works across multiple RoadRunner workers on one host and
prevents concurrent requests for the same session from overwriting each other.
Expired and abandoned empty records are removed probabilistically.

Do not use host-local files behind a load balancer with multiple application
replicas. Use a shared store with an equivalent per-session lease, or guarantee
sticky routing and shared storage whose locking semantics you have verified.

Replace the default through ordinary service discovery—no `$app->services()`
call is required:

```php
namespace App\Services;

use GustavPHP\Gustav\Attribute\Service;
use GustavPHP\Gustav\Service\Lifetime;
use GustavPHP\Gustav\Session\{SessionLeaseInterface, SessionStoreInterface};

#[Service(
    as: SessionStoreInterface::class,
    lifetime: Lifetime::Singleton,
)]
final class RedisSessionStore implements SessionStoreInterface
{
    public function acquire(
        string $id,
        bool $create = false,
    ): ?SessionLeaseInterface {
        // Acquire one distributed lock and return a RedisSessionLease.
    }
}
```

Store implementations are singletons and must not retain request-specific
state. `acquire($id, create: false)` returns `null` for an unknown ID and must
not create storage from arbitrary client cookies. The returned
`SessionLeaseInterface` owns all state for that one ID until `release()`.
