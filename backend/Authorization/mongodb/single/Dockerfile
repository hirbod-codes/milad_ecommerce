FROM  mongo:4 AS Base

COPY ./mongodb/single/scripts /mongodb/scripts

RUN chmod ugo+x /mongodb/scripts/run.sh

EXPOSE 27017

FROM Base AS development

CMD bash -c "/mongodb/scripts/run.sh"

FROM Base AS production

COPY ../convert_secret_to_env.sh /usr/local/bin/convert_secret_to_env.sh
RUN chmod +x /usr/local/bin/convert_secret_to_env.sh

CMD source /usr/local/bin/convert_secret_to_env.sh && /mongodb/scripts/run.sh
