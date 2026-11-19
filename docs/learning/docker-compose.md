# Docker Compose — local Postgres and Redis

**What it is:** one YAML file that lists the containers the app needs (image, version, ports, storage, health check). `docker compose up -d` starts them all; `down` stops them.

**Why we use it:** every laptop and every CI run gets the same Postgres and Redis versions with the same settings, in one command.

**What goes wrong without it:** you install Postgres on Windows by hand, its version drifts from Supabase, and you get bugs that only appear on one machine.

## Words
| Word | Meaning |
| --- | --- |
| Image | A read-only package of a program (`postgres:17-alpine`). The tag after `:` is the version; `alpine` = small Linux base |
| Container | A running copy of an image |
| Service | One entry under `services:` in the Compose file (ours: `postgres`, `redis`) |
| Volume | Storage that outlives the container. Delete the container, the data stays |
| Port mapping | `127.0.0.1:5432:5432` = laptop port → container port, laptop-only |
| Health check | A command Docker runs every few seconds to know the service is really ready, not just started |

## Commands (run from the repo root)
| Want to | Command |
| --- | --- |
| Start everything | `docker compose -f infra/docker-compose.yml up -d` |
| See status and health | `docker compose -f infra/docker-compose.yml ps` |
| Follow logs | `docker compose -f infra/docker-compose.yml logs -f postgres` |
| Open a SQL shell | `docker compose -f infra/docker-compose.yml exec postgres psql -U aliquot` |
| Ping Redis | `docker compose -f infra/docker-compose.yml exec redis redis-cli ping` |
| Stop (keep data) | `docker compose -f infra/docker-compose.yml down` |
| Stop and **delete data** | `docker compose -f infra/docker-compose.yml down -v` |

## Choices in our file
- **Versions pinned:** Postgres 17 (matches Supabase), Redis 7.4. Never `latest`: it changes under you.
- **`127.0.0.1:` in ports:** without it, anyone on the same Wi-Fi could reach your database.
- **Named volumes, not a folder:** see decision 002.
- **`${POSTGRES_PASSWORD:-aliquot_dev}`:** use the value from `infra/.env` if set, else the default. Local-only values.
- **`TZ: UTC`:** times are stored in UTC (CLAUDE.md); the lab's timezone is applied only when showing them.
- **`$$` in the health check:** `$$` tells Compose "don't fill this in"; the container's shell fills it in instead.

## Where it's used in Aliquot
- `infra/docker-compose.yml` — the services.
- `infra/.env.example` — the settings you can change (copy to `infra/.env`).
- Later: the API connects to `localhost:5432` and `localhost:6379`; CI uses the same images as GitHub Actions service containers.
