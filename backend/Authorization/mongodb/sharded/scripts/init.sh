#!/bin/bash

# Wait for all services to start
sleep 10

# Initialize the Config Server Replica Set
mongo --host authorization_mongodb_config1:27017 --eval 'rs.initiate({
  _id: "configrs",
  configsvr: true,
  members: [
    { _id: 0, host: "authorization_mongodb_config1:27017" },
    { _id: 1, host: "authorization_mongodb_config2:27017" },
    { _id: 2, host: "authorization_mongodb_config3:27017" }
  ]
})'

# Initialize Shard 1 Replica Set
mongo --host authorization_mongodb_shard1a:27017 --eval 'rs.initiate({
  _id: "shard1rs",
  members: [
    { _id: 0, host: "authorization_mongodb_shard1a:27017" },
    { _id: 1, host: "authorization_mongodb_shard1b:27017" },
    { _id: 2, host: "authorization_mongodb_shard1c:27017" }
  ]
})'

# Initialize Shard 2 Replica Set
mongo --host authorization_mongodb_shard2a:27017 --eval 'rs.initiate({
  _id: "shard2rs",
  members: [
    { _id: 0, host: "authorization_mongodb_shard2a:27017" },
    { _id: 1, host: "authorization_mongodb_shard2b:27017" },
    { _id: 2, host: "authorization_mongodb_shard2c:27017" }
  ]
})'

# Wait for replica sets to initialize
sleep 10

# Add Shards to the Cluster
mongo --host authorization_mongodb_mongos1:27017 --eval 'sh.addShard("shard1rs/authorization_mongodb_shard1a:27017,authorization_mongodb_shard1b:27017,authorization_mongodb_shard1c:27017")'
mongo --host authorization_mongodb_mongos1:27017 --eval 'sh.addShard("shard2rs/authorization_mongodb_shard2a:27017,authorization_mongodb_shard2b:27017,authorization_mongodb_shard2c:27017")'

mongo --host authorization_mongodb_mongos2:27017 --eval 'sh.addShard("shard1rs/authorization_mongodb_shard1a:27017,authorization_mongodb_shard1b:27017,authorization_mongodb_shard1c:27017")'
mongo --host authorization_mongodb_mongos2:27017 --eval 'sh.addShard("shard2rs/authorization_mongodb_shard2a:27017,authorization_mongodb_shard2b:27017,authorization_mongodb_shard2c:27017")'

# Read Docker secrets for admin credentials
if [ -z ${ADMIN_USERNAME+x} ]; then
    ADMIN_USERNAME=$(cat /run/secrets/authorization_mongodb_admin_username)
fi
if [ -z ${ADMIN_PASSWORD+x} ]; then
    ADMIN_PASSWORD=$(cat /run/secrets/authorization_mongodb_admin_password)
fi

# Create Admin User
mongo --host authorization_mongodb_mongos1:27017 --eval "db.getSiblingDB('admin').createUser({
  user: '$ADMIN_USERNAME',
  pwd: '$ADMIN_PASSWORD',
  roles: [
    { role: 'root', db: 'admin' }
  ]
})"

mongo --host authorization_mongodb_mongos2:27017 --eval "db.getSiblingDB('admin').createUser({
  user: '$ADMIN_USERNAME',
  pwd: '$ADMIN_PASSWORD',
  roles: [
    { role: 'root', db: 'admin' }
  ]
})"

echo "MongoDB Sharded Cluster initialized and admin user created successfully."
