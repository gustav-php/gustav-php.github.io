# Project Structure

Gustav PHP is flexible in terms of project structure, here you can find informations for the recommended structure that is used with the starter project.

## Directory Structure

This is the minimal directory structure to in the starter project.

```bash
├─ app/
│  └─ index.php
├─ cache/
├─ public/
├─ src/
│  ├─ Events/
│  ├─ Middlewares/
│  ├─ Routes/
│  ├─ Serializers/
│  └─ Services/
├─ views/
└─ gustav
```

The `app/index.php` is the entrypoint to your application.

The `cache/` directory is used for cache files with the views.

The `public/` directory contains all static files and are publically accessible in the root.

The `src/` directory contains all the components that build your application:

- `Events/` contains all Event listeners
- `Middlewares/` contains all Middlewares
- `Routes/` contains all Routes
- `Serializers/` contains all Serializers
- `Services/` contains application services and their implementations
