# Stream Relay (Go)

Prototype for single-upstream / multi-client channel relay. The service will:

- Maintain one upstream HLS/TS connection per channel.
- Serve HLS segments to downstream clients.
- Close upstream connections after inactivity.

Implementation TODOs:
- Worker pool managing upstream FFmpeg processes.
- Local segment storage (tmpfs/disk).
- Web API for status/metrics.

This module lives in `apps/stream-relay`. Build with Go 1.22+.
