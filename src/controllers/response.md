# Response

All routes should return a response to be sent back to the user. GustavPHP provides several different ways to return responses.

## HTML

HTML response is used to return HTML content to the user's browser. This is useful when you want to render a web page with dynamic content. To return an HTML response, you can use the `html(...)` method of your controller.

```php
#[Route('/html')]
public function index()
{
    return $this->html("<h1>Hello World!</h1>");
}
```

## JSON

You can return JSON using the `json(...)` method of your controller.

```php
#[Route('/json')]
public function index()
{
    return $this->json([
        'name' => 'Torsten',
        'age' => 30,
        'company' => 'Appwrite'
    ]);
}
```

## XML

You can return XML using the `xml(...)` method of your controller.

```php
#[Route('/xml')]
public function index()
{
    return $this->xml("<note>Hello World!</note>");
}
```

## Redirect

You can perform a HTTP redirect using the `redirect(...)` method of your controller.

```php
#[Route('/redirect')]
public function index()
{
    return $this->redirect("/json");
}
```

## Serialize

You can serialize your response payload using the `serialize(...)` method of your controller.

```php
#[Route('/serialize')]
public function index()
{
    return $this->serialize(new Cat());
}
```

You can find out more about Serialization [here](./serialization.md).

## View

_tbd_

## HTTP errors

Throw `Http\Exception\HttpException` when a request should fail with a specific
HTTP status and optional headers:

```php
use GustavPHP\Gustav\Http\Exception\HttpException;

throw new HttpException(
    404,
    'Dog not found',
    ['X-Error-Code' => 'DOG_NOT_FOUND'],
);
```

In production, Gustav returns a JSON error document and hides messages from
unexpected server exceptions. In development, the same exception is rendered
with the debug page. Authentication exceptions use this mechanism for `401`
and `403` responses.
