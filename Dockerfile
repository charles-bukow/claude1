FROM debian:12.5-slim
EXPOSE 80
WORKDIR /home

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fSL -o node.tar.gz https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.gz \
    && mkdir -p /usr/local/nodejs \
    && tar -xzf node.tar.gz -C /usr/local/nodejs --strip-components=1 \
    && rm node.tar.gz \
    && ln -s /usr/local/nodejs/bin/node /usr/local/bin/node \
    && ln -s /usr/local/nodejs/bin/npm /usr/local/bin/npm

# Download RD Multi-Scraper from GitHub
RUN curl -L -o rd-scraper.zip https://github.com/charles-bukow/claude1/archive/refs/heads/main.zip \
    && unzip rd-scraper.zip && rm rd-scraper.zip \
    && mv claude1-main/* . && rm -rf claude1-main

# Install app dependencies
RUN npm install

# Create necessary directories with permissions
RUN mkdir -p data/cache log temp && \
    chmod -R 777 data log temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Start the application
CMD ["npm", "start"]
