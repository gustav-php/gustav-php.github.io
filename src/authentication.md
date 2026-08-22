# Authentication

Gustav separates credential parsing from application-specific identity
verification. The framework provides parsers for Basic, Bearer, and API-key
credentials, while your application decides whether those credentials are
valid and which identity they represent.

## Define an identity

```php
use GustavPHP\Gustav\Auth\Identity;

readonly class UserIdentity implements Identity
{
    public function __construct(
        private string $id,
        private array $roles,
    ) {
    }

    public function getIdentifier(): string
    {
        return $this->id;
    }

    public function getRoles(): array
    {
        return $this->roles;
    }
}
```

## Authenticate a request

Implement `Authenticator` and use one of the credential parsers. Throw an
authentication exception when verification fails.

```php
use GustavPHP\Gustav\Auth\Authenticator;
use GustavPHP\Gustav\Auth\BearerAuth;
use GustavPHP\Gustav\Auth\Exception\UnauthorizedException;
use GustavPHP\Gustav\Auth\Identity;
use Psr\Http\Message\ServerRequestInterface;

class TokenAuthenticator implements Authenticator
{
    public function authenticate(ServerRequestInterface $request): Identity
    {
        $credentials = BearerAuth::fromRequest($request);

        $user = $this->users->findByToken($credentials->getToken());
        if ($user === null) {
            throw new UnauthorizedException(
                'Bearer token is invalid',
                ['WWW-Authenticate' => 'Bearer error="invalid_token"'],
            );
        }

        return new UserIdentity($user->id, $user->roles);
    }
}
```

Attach the authentication middleware to a controller or individual route:

```php
use GustavPHP\Gustav\Attribute\{AuthUser, Middleware, Route};
use GustavPHP\Gustav\Auth\AuthenticationMiddleware;
use GustavPHP\Gustav\Auth\Identity;

class AccountController extends Controller\Base
{
    #[Route('/account')]
    #[Middleware(new AuthenticationMiddleware(new TokenAuthenticator()))]
    public function account(#[AuthUser] Identity $identity): Controller\Response
    {
        return $this->json([
            'id' => $identity->getIdentifier(),
            'roles' => $identity->getRoles(),
        ]);
    }
}
```

Missing or invalid Basic and Bearer credentials produce a `401` response with
the corresponding `WWW-Authenticate` challenge. `#[AuthUser]` also produces a
`401` response if no authentication middleware supplied an identity. Throw
`Auth\Exception\ForbiddenException` when an authenticated identity lacks the
required permission; Gustav maps it to a `403` response.
