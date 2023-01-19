# Use the official Node.js 10 image.
# https://hub.docker.com/_/node
FROM node:18.12.1

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY ./package*.json ./

# Install production dependencies.
RUN npm i --omit=dev

# Copy local code to the container image.
COPY ./src/ ./src/
COPY ./site/ ./site/

# Copy the runner script.
COPY ./deployment/cloudRun.cjs ./deployment/cloudRun.cjs

# Run the web service on container startup.
CMD ["node", "/usr/src/app/deployment/cloudRun.cjs"]