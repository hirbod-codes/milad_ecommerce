FROM rabbitmq:3-management AS production

COPY ./rabbitmq/cluster/init.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD /entrypoint.sh
