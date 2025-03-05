# Dockerfile
FROM redis:7.0

# Install dependencies for cluster initialization
RUN apt-get update && apt-get install -y curl dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Copy the initialization script
COPY init-cluster.sh /usr/local/bin/init-cluster.sh
RUN chmod +x /usr/local/bin/init-cluster.sh

# Set the entrypoint to run the initialization script
ENTRYPOINT ["/usr/local/bin/init-cluster.sh"]
