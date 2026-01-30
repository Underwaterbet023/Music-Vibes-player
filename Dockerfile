# Use Node.js LTS
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Expose the port from server.js (3000)
EXPOSE 3000

# Start the server
CMD [ "node", "server.js" ]
