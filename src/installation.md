# Getting started

Before creating your first GustavPHP project, you should ensure that your local machine has [PHP](https://www.php.net/) and [Composer](https://getcomposer.org/) installed.

After you have installed PHP and Composer, you may create a new GustavPHP project via the `create-project` command:

```bash
composer create-project gustav-php/starter example-app
```

After the project has been created, start GustavPHP's local development server using the serve command:

```bash
cd example-app

php gustav dev
```

Once the development server starts, the application is available at
`http://localhost:4201`.

The starter's committed `.env` contains safe development defaults. Copy
machine-specific values into `.env.local`; Gustav loads it automatically and
the file is ignored by Git.
