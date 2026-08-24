# Production

Enable production mode with the real environment variable `MODE=production`.
Production responses hide unexpected exception messages, class names, files,
and traces.

Keep only safe local defaults in the committed `.env` file and keep
`.env.local` out of Git. Deployment environment variables override both files,
so secrets can come from the hosting platform without changing application
code. Typed `#[Config]` classes are hydrated and validated before RoadRunner
starts serving requests. A missing or invalid variable fails startup with the
variable and field name, but not its rejected raw value.

Workers capture configuration once at startup. Restart them after changing an
environment variable.

Conventional sessions use `storage/sessions`, so the worker needs write access
to that directory. The file store coordinates multiple RoadRunner workers on
one host. Deployments with multiple application replicas need a discovered
shared `SessionStoreInterface` implementation with per-session locking; local
files on separate hosts do not share state. See
[Sessions and CSRF](./sessions.md#storage-and-deployment).

Application commands use the same production mode. Unexpected command
exceptions are logged with the command name while console output remains the
safe message `Command failed`.

Start the production server with:

```sh
php gustav start
```

The starter uses `.rr.prod.yaml` for this command. Keep RoadRunner's PHP worker
channel at `info` so it collects Gustav's structured `STDERR` records:

```yaml
logs:
    mode: production
    encoding: json
    level: info
    channels:
        server:
            mode: raw
            level: info
```

Gustav automatically reports every `5xx` once and adds `X-Request-ID` to every
response. Expected `4xx` responses are not logged automatically. See
[Logging and request IDs](./logging.md) for the record shape, safe context, and
custom PSR-3 logger bindings.

Do not print from application code under RoadRunner. Worker `STDOUT` carries
the transport protocol; inject `Psr\Log\LoggerInterface`, which writes to
`STDERR` by default.
