FROM docker.io/cloudflare/sandbox:0.6.0-python

# Install C++ compiler and tools for C++ language support
RUN apt-get update && apt-get install -y \
    g++ \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install nlohmann/json library (header-only JSON library for C++)
RUN mkdir -p /usr/local/include && \
    cd /tmp && \
    git clone --depth 1 https://github.com/nlohmann/json.git && \
    cp json/single_include/nlohmann/json.hpp /usr/local/include/ && \
    rm -rf /tmp/json

# Verify C++ compiler installation
RUN g++ --version

# Required during local development to access exposed ports
EXPOSE 8080