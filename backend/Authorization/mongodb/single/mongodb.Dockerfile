FROM  mongo:4

COPY ./mongodb/single/scripts /mongodb/scripts

RUN chmod ugo+x /mongodb/scripts/run.sh

EXPOSE 27017

CMD bash -c "/mongodb/scripts/run.sh"
