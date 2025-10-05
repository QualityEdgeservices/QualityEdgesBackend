# Dockerfile
# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (better for Docker caching)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Create necessary directories and set permissions for logging
RUN mkdir -p log/db/info && chmod -R 777 log

# Expose the port the app will run on
EXPOSE 9000

# Use a non-root user for added security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Command to start the application
CMD ["npm", "run", "start"]
