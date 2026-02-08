## Views

Views are powered by the [Latte](https://latte.nette.org) template engine and can be used in controller endpoints like this:

```php
#[Route('/')]
public function index()
{
    return $this->view(__DIR__ . '/../views/index.latte', [
        'title' => 'lorem ipsum',
        'content' => 'Lorem ipsum dolor...'
    ]);
}
```

And the `index.latte` can be used like this:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>{$title}</title>
	</head>

	<body>
		{$content}
	</body>
</html>
```
