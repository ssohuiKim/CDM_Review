# Use the official Node.js 22 image as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the entire project to the working directory except node_modules
COPY . .

# Build the SvelteKit project (adapter-static)
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Serve the static build output using sirv-cli
CMD ["npx", "sirv-cli", "build", "--port", "3000", "--host", "0.0.0.0", "--single"]