# for local development

```bash
cd path/to/project

# docker images -q | grep -v "$(docker images -q mongo:4.0 redis:7.0 rabbitmq:3-management prom/prometheus:latest grafana/grafana:latest opensearchproject/opensearch:2.11.1 opensearchproject/opensearch-dashboards:2.11.1 mongo-express:latest ghcr.io/joeferner/redis-commander:latest nginx:alpine)" | xargs -r docker image rm -f

docker system prune -f ---volumes; docker rm -f $(docker ps -aq); docker image rm -f $(docker image ls -f "dangling=true" -q); docker rm -f $(docker ps -aq); docker volume rm -f $(docker volume ls -q); docker compose -f compose.yml up --build --remove-orphans
```

visit `https://localhost:443`

## HTTPS for localhost

generate certificates properly and add them to your browser:

```bash
openssl req -newkey rsa:2048 -nodes -keyout localhost.key -out localhost.csr
openssl x509 -req -days 365 -in localhost.csr -signkey localhost.key -out localhost.crt

mkdir ./authority
cd ./authority
openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.crt -days 3650

cd ..
openssl x509 -req -in localhost.csr -CA ./authority/ca.crt -CAkey ./authority/ca.key -CAcreateserial -out localhost.crt -days 365 -sha256

# firefox only accepts pkcs12 format
openssl pkcs12 -export -in localhost.crt -inkey localhost.key -out localhost.p12
```
