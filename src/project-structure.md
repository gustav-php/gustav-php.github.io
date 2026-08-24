# Project Structure

Gustav does not force a project layout. This is the conventional structure used
by the starter project.

## Directory Structure

The minimal starter structure is:

```bash
├─ app/
│  ├─ bootstrap.php
│  └─ index.php
├─ .env
├─ public/
├─ src/
│  ├─ Config/
│  ├─ Commands/
│  ├─ Events/
│  ├─ Middlewares/
│  ├─ Routes/
│  ├─ Serializers/
│  └─ Services/
├─ storage/
├─ views/
└─ gustav
```

The `app/bootstrap.php` returns the shared application configuration used by
both the HTTP worker and project CLI. The `app/index.php` starts the HTTP
application with that configuration.

The committed `.env` file contains safe local defaults. Put machine-specific
values in the ignored `.env.local` file and production secrets in real
environment variables.

The `public/` directory contains static files exposed from the site root.

The `views/` directory contains native PHP templates using the `.phtml`
extension. PHP's normal opcode cache handles compiled code in production;
Gustav does not require a writable view cache directory.

The ignored `storage/` directory contains runtime data. Conventional projects
create `storage/sessions/` lazily when session state is first used; the worker
must be able to write there.

The `src/` directory contains all the components that build your application:

- `Config/` contains immutable typed application configuration
- `Commands/` contains automatically discovered application commands
- `Events/` contains typed event objects and discovered `#[Listener]` classes
- `Middlewares/` contains all Middlewares
- `Routes/` contains all Routes
- `Serializers/` contains all Serializers
- `Services/` contains application services, third-party object factories, and
  advanced service providers
