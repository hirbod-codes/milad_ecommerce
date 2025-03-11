#!/bin/sh

createEnvironmentVariables() {
    local file_name=$1
    echo "file name: $file_name"

    local value=$2
    echo "value: $value"

    local prefix=$3
    echo "prefix: $prefix"

    local k=${file_name##${prefix:-""}}
    echo "trimmed file name: $k"

    local lowerK=$(echo $k | tr '[:upper:]' '[:lower:]')
    echo "lowerK: $lowerK"

    local upperK=$(echo $k | tr '[:lower:]' '[:upper:]')
    echo "upperK: $upperK"

    export ${k}=$value
    export ${lowerK}=$value
    export ${upperK}=$value
}


createEnvironmentVariables _host "0.0.0.0" _
createEnvironmentVariables _port "3000" _
createEnvironmentVariables _port "3000" _

createEnvironmentVariables __jwt_secret very_secret __
createEnvironmentVariables __access_token_expires_in 1800 __
createEnvironmentVariables __refresh_token_expires_in 604800 __
createEnvironmentVariables __otp_provider_username 09380978577 __
createEnvironmentVariables __otp_provider_password "f29e52c5-f168-471b-a07b-718f416f7ee8" __
createEnvironmentVariables __otp_provider_sender_number 50004001097857 __
createEnvironmentVariables __email taghalloby@gmail.com __
createEnvironmentVariables __email_password "pgmc xojm emki mksd" __
createEnvironmentVariables __google_client_id 380103624736-onrv4mne42t89atn4gpougk9ocqln5pl.apps.googleusercontent.com __
createEnvironmentVariables __google_client_secret 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 __
createEnvironmentVariables __db_database_name primaryDB __
createEnvironmentVariables __db_supports_transaction 'false' __
createEnvironmentVariables __db_url mongodb://localhost:8082 __
createEnvironmentVariables __mongodb_username admin __
createEnvironmentVariables __mongodb_password password __
createEnvironmentVariables __redis_type single __
createEnvironmentVariables __redis_initial_node_url redis://redis:6379 __

# echo bbCdfgJKJoOIJjoIUI $bbCdfgJKJoOIJjoIUI
# echo bbcdfgjkjooijjoiui $bbcdfgjkjooijjoiui
# echo BBCDFGJKJOOIJJOIUI $BBCDFGJKJOOIJJOIUI

# exit 1

# ls -al /run/secrets

# echo "secret_prefix: $secret_prefix"

# if [[ ! -d /run/secrets/ ]]; then
#     echo 'there is no secret to use!'
# else
#     for secret_file in /run/secrets/*; do
#         echo "secret file: $secret_file"
#         createEnvironmentVariables $(basename $secret_file) $(cat $secret_file) $secret_prefix
#     done
# fi
