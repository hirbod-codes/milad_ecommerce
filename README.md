# for local development

```bash
cd path/to/project
docker image rm -f $(docker image ls -f "dangling=true" -q) && docker rm -f $(docker ps -aq); docker volume rm -f $(docker volume ls -q); docker compose -f compose.yml up --build --remove-orphans
```
