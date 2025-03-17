#!/bin/sh

# Start RabbitMQ in the background
rabbitmq-server -detached

# Wait for RabbitMQ to start
sleep 10s

# Join the cluster if CLUSTER_JOIN is set
if [ -n "$CLUSTER_JOIN" ]; then
    echo "Joining cluster with $CLUSTER_JOIN..."
    rabbitmqctl stop_app
    rabbitmqctl reset
    rabbitmqctl join_cluster rabbit@$CLUSTER_JOIN
    rabbitmqctl start_app
fi

# Start RabbitMQ in the foreground
rabbitmq-server
