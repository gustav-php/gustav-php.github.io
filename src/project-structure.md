# Project Structure

Gustav does not force a project layout. This is the conventional structure used
by the starter project.

## Directory Structure

The minimal starter structure is:

```bash
├─ app/
│  └─ index.php
├─ cache/
├─ .env
├─ public/
├─ src/
│  ├─ Config/
│  ├─ Events/
│  ├─ Middlewares/
│  ├─ Routes/
│  ├─ Serializers/
│  └─ Services/
├─ views/
└─ gustav
```

The `app/index.php` is the entrypoint to your application.

The `cache/` directory stores compiled view files.

The committed `.env` file contains safe local defaults. Put machine-specific
values in the ignored `.env.local` file and production secrets in real
environment variables.

The `public/` directory contains static files exposed from the site root.

The `src/` directory contains all the components that build your application:

- `Config/` contains immutable typed application configuration
- `Events/` contains all Event listeners
- `Middlewares/` contains all Middlewares
- `Routes/` contains all Routes
- `Serializers/` contains all Serializers
- `Services/` contains application services and their implementations
