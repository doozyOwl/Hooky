FROM node:12-alpine
LABEL description="Hooky"
LABEL author="Sathyamoorthy K"

# default env is production
ENV NODE_ENV production

# Setup workdir
WORKDIR /usr/src/hooky

# change ownership for workdir
RUN chown node:node /usr/src/hooky -R

# change user to node.
USER node

# Copy our dependencies
COPY --chown=node:node lib ./lib
COPY --chown=node:node index.js ./index.js
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install

# Start server
EXPOSE 3000
CMD ["npm", "start"]