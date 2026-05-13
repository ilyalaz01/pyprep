---
module_id: 4
sphere_id: "m4-s3"
title: "Docker"
title_ru: "Docker"
estimated_minutes: 14
prerequisites: ["m4-s1", "m4-s2"]
tags: ["docker", "containers", "dockerfile", "images", "volumes", "interview-classic"]
---

# Docker

Containerization is baseline now. Backend roles assume you can read a `Dockerfile`, run a container, map a port, attach a volume. Student-level interviews ask "what's the difference between an image and a container" as a binary screen — get it wrong and the conversation ends; get it right and the question deepens to "what's wrong with this Dockerfile?" The bar here isn't deep Docker internals; it's whether you can ship code and debug a running container without freezing.

## Why this matters in interviews

The probes are all operational shape: "How do you debug a running container?" (`docker logs`, then `docker exec -it CID bash` for a shell). "Why does Dockerfile order matter?" (layer cache invalidation; less-changed files first). "What does `docker run` actually do?" (creates a fresh container from an image, starts the configured process, exits when it does). "Where did my database go after `docker rm`?" (it lived in the container filesystem; without a volume, it's gone). A candidate who answers these reflexively passes Docker; one who hedges has only used `docker-compose up` and never debugged a failure.

---

## Concept 1 — Image vs container

- **Image:** an immutable, read-only template. A frozen filesystem + the metadata that says "when started, run process X with env Y from working directory Z". Think of it as a class.
- **Container:** a running (or stopped) instance of an image, with its own writable layer on top of the image's read-only layers. Think of it as an object. One image → many containers.

Images are built (`docker build -t myapp .` reads `Dockerfile`, produces an image). Containers are created (`docker run myapp` spawns a fresh container from the image). Images are stored in **registries** (Docker Hub, GitHub Container Registry, AWS ECR); containers live on the host running them.

**The immutability matters.** When a container writes a file, the write goes to its own writable layer — the image is unchanged. Start a second container from the same image and it sees the *original* filesystem, not the first container's modifications. This is the crucial mental model: **containers are disposable; only images and named volumes survive.**

---

## Concept 2 — `Dockerfile`: `FROM`, `WORKDIR`, `COPY`, `RUN` + layer caching

```dockerfile
FROM python:3.13-slim          # base image (slim = smaller)
WORKDIR /app                   # set working dir; later commands run here

COPY requirements.txt .        # copy dep list first
RUN pip install -r requirements.txt   # install deps — cached on its own layer

COPY . .                       # NOW copy the application code

EXPOSE 8000                    # documentation only — doesn't publish anything
ENV LOG_LEVEL=INFO

CMD ["python", "app.py"]
```

**The layer-caching rule:** each `Dockerfile` instruction creates a layer. On rebuild, Docker reuses a cached layer if (a) the instruction is byte-identical to last time and (b) all inputs are unchanged. **The moment one layer's cache is invalidated, every layer below it must rebuild.**

The order above is deliberate. `requirements.txt` changes rarely; the app code changes constantly. By copying `requirements.txt` first and running `pip install` *before* `COPY . .`, the expensive pip-install layer stays cached across every code-only change. Reversed order (`COPY . .` first, then `RUN pip install`) means a one-line code edit busts the cache and triggers a full re-install — minutes wasted on every rebuild.

**Multi-stage builds** are the next-level optimization. Use one stage to compile / install / build, then `COPY --from=builder /app /app` into a clean minimal final image, dropping build-time dependencies. The runtime image ends up megabytes, not gigabytes.

---

## Concept 3 — `CMD` vs `ENTRYPOINT` (and exec vs shell form)

```dockerfile
CMD ["python", "app.py"]               # default command (overridable)
ENTRYPOINT ["python"]                  # fixed executable (always runs)

# Combined:
ENTRYPOINT ["python"]
CMD ["app.py"]                         # `docker run img` runs `python app.py`;
                                       # `docker run img other.py` runs `python other.py`
```

- **`CMD`** sets the *default command*. `docker run image` runs it. `docker run image somethingelse` replaces it entirely.
- **`ENTRYPOINT`** sets the *fixed executable*. Args from `docker run` are *appended* to it. Use `ENTRYPOINT` when the container IS a tool (a CLI utility); use `CMD` alone when the container is a service.

**Exec form (`["python", "app.py"]`) vs shell form (`python app.py`):** exec form is preferred. Shell form wraps the command in `/bin/sh -c "..."`, which means your process runs as a child of `sh`. Two consequences:

1. **`sh` is PID 1**, not your application. Signals sent to the container go to `sh`, which doesn't forward them. `docker stop` sends SIGTERM, `sh` ignores it, Docker waits the grace period (default 10s), then SIGKILL — your app gets *no* graceful shutdown.
2. Exec form runs your process directly as PID 1, so SIGTERM reaches the application and graceful shutdown works.

**Rule: always use exec form unless you specifically need shell features** (variable expansion, pipes). When you do need shell, do it explicitly: `CMD ["sh", "-c", "exec python app.py"]` — the `exec` makes Python replace the shell at PID 1, restoring signal forwarding.

---

## Concept 4 — `build`, `run`, `ps`, `logs`, `exec`

```bash
docker build -t myapp:v1 .            # build image, tag as myapp:v1
docker run myapp:v1                   # run attached; Ctrl-C stops
docker run -d myapp:v1                # detached (background)
docker run -d --name api myapp:v1     # named (instead of auto-generated random)
docker run --rm myapp:v1              # auto-remove on exit (don't pile up dead containers)

docker ps                             # list RUNNING containers
docker ps -a                          # include stopped
docker logs <id_or_name>              # view stdout/stderr
docker logs -f <id>                   # follow live (like tail -F)
docker exec -it <id> bash             # interactive shell in a RUNNING container
docker stop <id>                      # SIGTERM, then SIGKILL after timeout (default 10s)
docker rm <id>                        # remove stopped container
```

**Debugging a misbehaving container** is the canonical operator workflow:

1. `docker logs -f api` — what is it printing? Errors? Crashed?
2. `docker exec -it api bash` (or `sh` for slim images) — get a shell, inspect filesystem, check config, test connectivity from inside.
3. If the container exited: `docker logs api` works on stopped containers too; `docker ps -a` finds them.

**Two operational footguns:**

- **Without `--rm`,** stopped containers pile up forever. `docker ps -a` shows hundreds of `Exited (0) ...` lines after a few days of dev iteration. `docker container prune` cleans them; `docker run --rm` prevents them.
- **`--name` collides on re-run.** `docker run --name api ...` works once; the second time, you get `Error: Conflict. The container name "/api" is already in use`. Add `--rm`, or `docker rm api` between runs.

---

## Concept 5 — Port mapping `-p`; volumes `-v` for persistence

```bash
docker run -p 8000:80 nginx              # host port 8000 → container port 80
docker run -p 127.0.0.1:8000:80 nginx    # bind only to localhost (not all interfaces)
docker run -v /host/data:/data nginx     # bind mount: maps a host path
docker run -v myvol:/data nginx          # named volume: Docker manages location
```

**Port mapping.** Without `-p`, container ports are unreachable from the host. `EXPOSE 8000` in a Dockerfile is *documentation only* — it doesn't publish. The actual publish is `-p` at `docker run` time. `-p 8000:80` reads as `host:container`; common shape `-p 8000:8000` is the same port both sides.

**Volumes.** The container's writable layer disappears when the container is removed. Anything you want to survive — databases, uploaded files, accumulated state — must live in a volume:

- **Bind mount** (`-v /host/path:/container/path`): maps an explicit host directory. Useful for development (live-edit code on the host; container sees changes immediately).
- **Named volume** (`-v myvol:/container/path`): Docker manages the host location (typically `/var/lib/docker/volumes/myvol/_data`). Cleaner for production state; survives container removal until you explicitly `docker volume rm myvol`.

**Why databases need volumes:** a Postgres container without a volume loses *every byte of data* the moment you `docker rm` it. The data lives in the container's writable layer, which is part of the container — removing the container removes the data. Production databases bind a named volume to the data directory so the database state outlives the container.

---

## Quick check before you run cards

1. You change one line of Python code in your app. Why does the order of `COPY` and `RUN pip install` in your Dockerfile determine whether the rebuild takes 5 seconds or 5 minutes?
2. `CMD ["python", "app.py"]` vs `CMD python app.py` — what does the latter do that the former doesn't, and why does it matter for `docker stop`?
3. Walk through how you'd debug a Python web app that started fine but stopped responding 30 minutes in.
4. `docker run -p 8000:80 nginx` — which port do you visit from the host? Which port does nginx think it's listening on?
5. You stop and remove a Postgres container without using a volume. What state is left, and what's gone?

If any feels shaky — re-read that section, then start the cards.
