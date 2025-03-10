# Enable job control
set -m

mongod --auth --port 27017 --dbpath /data/db --bind_ip_all &

echo "\n\nWaiting...................................................................................\n\n"
sleep 10s
echo "\n\nWaited...................................................................................\n\n"

echo "
use admin

db.createUser(
  {
    user: \"$MONGODB_USERNAME\",
    pwd: \"$MONGODB_PASSWORD\",
    roles: [
      { role: \"root\", db: \"admin\" },
      { role: \"userAdminAnyDatabase\", db: \"admin\" },
      { role: \"readWriteAnyDatabase\", db: \"admin\" }
    ]
  }
)

use $databaseName
" >./tmpscript

mongo <./tmpscript

rm ./tmpscript

fg
