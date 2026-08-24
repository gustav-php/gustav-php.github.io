# Installation

GustavPHP requires PHP 8.2 or newer and
[Composer](https://getcomposer.org/). Composer checks the required PHP
extensions when it creates the project.

Create a project from the starter:

```bash
composer create-project gustav-php/starter example-app
```

Move into the project and start the development server:

```bash
cd example-app

php gustav dev
```

Once the development server starts, the application is available at
`http://localhost:4201`.

The starter's committed `.env` contains safe development defaults. Copy
machine-specific values into `.env.local`; Gustav loads it automatically and
the file is ignored by Git.

Next, add your [first endpoint](./first-endpoint.md).
