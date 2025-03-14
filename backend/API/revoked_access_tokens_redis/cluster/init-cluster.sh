#!/bin/bash

# init-cluster.sh

# Start Redis server in the background
redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes --daemonize yes

echo "HOSTNAME $HOSTNAME"

# Initialize the Redis cluster
if [ $HOSTNAME == "redis-1" ]; then
    # Wait for all nodes to be ready
    echo "Waiting for all Redis nodes to start..."
    sleep 5s

    # # Get the IP addresses of all Redis nodes
    # # REDIS_NODES=$(dig +short tasks.redis | awk '{print $1 ":6379"}' | tr '\n' ' ')
    # REDIS_NODES=$(nslookup tasks.redis | grep -oP 'Address:\s*\K[0-9.]+' | awk '{print $1 ":6379"}' | tr '\n' ' ')
    # echo "REDIS_NODES $REDIS_NODES"

    # if [ -z "$REDIS_NODES" ]; then
    #     echo "Failed to discover Redis nodes. Exiting."
    #     exit 1
    # fi

    echo "Initializing Redis cluster..."
    echo "yes" | redis-cli --cluster create revoked_access_tokens_redis_1:6379 revoked_access_tokens_redis_2:6379 revoked_access_tokens_redis_3:6379 revoked_access_tokens_redis_4:6379 revoked_access_tokens_redis_5:6379 revoked_access_tokens_redis_6:6379 --cluster-replicas 1
fi

# Keep the container running
tail -f /dev/null
