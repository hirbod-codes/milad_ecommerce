#!/bin/bash

echo Initialize the Config Server Replica Set
mongo --host authorization_mongodb_config1:27017 --eval 'rs.initiate({
  _id: "configrs",
  configsvr: true,
  members: [
    { _id: 0, host: "authorization_mongodb_config1:27017" },
    { _id: 1, host: "authorization_mongodb_config2:27017" },
    { _id: 2, host: "authorization_mongodb_config3:27017" }
  ]
})'

echo Initialize Shard 1 Replica Set
mongo --host authorization_mongodb_shard1a:27017 --eval 'rs.initiate({
  _id: "shard1rs",
  members: [
    { _id: 0, host: "authorization_mongodb_shard1a:27017" },
    { _id: 1, host: "authorization_mongodb_shard1b:27017" },
    { _id: 2, host: "authorization_mongodb_shard1c:27017" }
  ]
})'

echo Initialize Shard 2 Replica Set
mongo --host authorization_mongodb_shard2a:27017 --eval 'rs.initiate({
  _id: "shard2rs",
  members: [
    { _id: 0, host: "authorization_mongodb_shard2a:27017" },
    { _id: 1, host: "authorization_mongodb_shard2b:27017" },
    { _id: 2, host: "authorization_mongodb_shard2c:27017" }
  ]
})'

echo Waiting for replica sets to initialize
sleep 40s

echo Add Shards to the Cluster
mongo --host authorization_mongodb_mongos1:27017 --eval 'sh.addShard("shard1rs/authorization_mongodb_shard1a:27017,authorization_mongodb_shard1b:27017,authorization_mongodb_shard1c:27017")'
mongo --host authorization_mongodb_mongos1:27017 --eval 'sh.addShard("shard2rs/authorization_mongodb_shard2a:27017,authorization_mongodb_shard2b:27017,authorization_mongodb_shard2c:27017")'

mongo --host authorization_mongodb_mongos2:27017 --eval 'sh.addShard("shard1rs/authorization_mongodb_shard1a:27017,authorization_mongodb_shard1b:27017,authorization_mongodb_shard1c:27017")'
mongo --host authorization_mongodb_mongos2:27017 --eval 'sh.addShard("shard2rs/authorization_mongodb_shard2a:27017,authorization_mongodb_shard2b:27017,authorization_mongodb_shard2c:27017")'

echo Read Docker secrets for admin credentials
if [ -z ${MONGODB_USERNAME+x} ]; then
    MONGODB_USERNAME=$(cat /run/secrets/authorization_mongodb_admin_username)
fi
if [ -z ${MONGODB_PASSWORD+x} ]; then
    MONGODB_PASSWORD=$(cat /run/secrets/authorization_mongodb_admin_password)
fi

echo Create Admin User

mongo --host authorization_mongodb_mongos1:27017 --eval "db.getSiblingDB('admin').createUser({
  user: '$MONGODB_USERNAME',
  pwd: '$MONGODB_PASSWORD',
  roles: [
    { role: 'root', db: 'admin' }
  ]
})"

mongo --host authorization_mongodb_mongos2:27017 --eval "db.getSiblingDB('admin').createUser({
  user: '$MONGODB_USERNAME',
  pwd: '$MONGODB_PASSWORD',
  roles: [
    { role: 'root', db: 'admin' }
  ]
})"

echo "MongoDB Sharded Cluster initialized and admin user created successfully."
