# Production

Enable production mode with `MODE=production` or configure it in
`app/index.php`. Production responses hide unexpected exception messages,
class names, files, and traces.

To start the production serve just run:

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
