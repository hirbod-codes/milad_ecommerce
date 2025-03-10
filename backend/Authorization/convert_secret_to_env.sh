createEnvironmentVariables() {
    local file_name=$1
    echo "file name: $file_name"

    local value=$2
    echo "value: $value"

    local prefix=$3
    echo "prefix: $prefix"

    echo ${file_name##${prefix:-""}}
    local trimmed_file_name=${file_name##${prefix:-""}}
    echo "trimmed file name: $trimmed_file_name"

    export ${trimmed_file_name}=$value
    export ${trimmed_file_name,,}=$value
    export ${trimmed_file_name^^}=$value
}

ls -al /run/secrets

echo "secret_prefix: $secret_prefix"

if [[ ! -d /run/secrets/ ]]; then
    echo 'there is no secret to use!'
else
    for secret_file in /run/secrets/*; do
        echo "secret file: $secret_file"
        createEnvironmentVariables $(basename $secret_file) $(cat $secret_file) $secret_prefix
    done
fi

# Chain with existing entrypoint (if any)
exec "$@"
