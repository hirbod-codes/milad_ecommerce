# for local development

```bash
cd path/to/project
docker image rm -f $(docker image ls -f "dangling=true" -q) && docker rm -f $(docker ps -aq); docker volume rm -f $(docker volume ls -q); docker compose -f compose.yml up --build --remove-orphans
```

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
