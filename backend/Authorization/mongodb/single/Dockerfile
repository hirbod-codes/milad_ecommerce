FROM  mongo:4 AS base

COPY ./mongodb/single/scripts /mongodb/scripts

RUN chmod ugo+x /mongodb/scripts/run.sh

EXPOSE 27017

FROM base AS development

CMD bash -c "/mongodb/scripts/run.sh"

FROM base AS production

COPY ../convert_secret_to_env.sh /usr/local/bin/convert_secret_to_env.sh
RUN chmod +x /usr/local/bin/convert_secret_to_env.sh

CMD source /usr/local/bin/convert_secret_to_env.sh && /mongodb/scripts/run.sh
