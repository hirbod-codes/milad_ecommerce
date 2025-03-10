# Dockerfile
FROM redis:7.0 AS base

RUN apt-get update && apt-get install -y curl dnsutils \
    && rm -rf /var/lib/apt/lists/*

COPY ./redis/cluster/init-cluster.sh /usr/local/bin/init-cluster.sh
RUN chmod +x /usr/local/bin/init-cluster.sh

FROM base AS development

ENTRYPOINT ["/usr/local/bin/init-cluster.sh"]

FROM base AS production

COPY ./convert_secret_to_env.sh /usr/local/bin/convert_secret_to_env.sh
RUN chmod +x /usr/local/bin/convert_secret_to_env.sh

CMD . /usr/local/bin/convert_secret_to_env.sh && /usr/local/bin/init-cluster.sh
