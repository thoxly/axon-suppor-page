FROM node:18-alpine

WORKDIR /app

# Add a .npmrc file to ensure we use the correct registry
RUN echo "registry=https://registry.npmjs.org/" > .npmrc

# Install dependencies only when package.json changes
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

EXPOSE 3002

# Set environment variables
ENV CHOKIDAR_USEPOLLING=true
ENV PORT=3002
ENV HOST=0.0.0.0
ENV WDS_SOCKET_HOST=0.0.0.0
ENV WDS_SOCKET_PORT=3002

# Use development mode with hot reload
CMD ["npm", "start"] 
