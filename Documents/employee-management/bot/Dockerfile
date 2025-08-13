FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set environment variable for hot reload on Mac/Windows
ENV CHOKIDAR_USEPOLLING=true

# Start the application with nodemon for development
CMD ["npm", "run", "dev"] 