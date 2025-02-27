# Use the official Node.js 22 image as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the entire project to the working directory except node_modules
# COPY . .
COPY build /app/build


# Build the SvelteKit project
RUN npm run build

# # Expose the port that the SvelteKit app will run on
EXPOSE 3000

# # Start the SvelteKit app
CMD ["npx", "serve", "-s", "build"]
