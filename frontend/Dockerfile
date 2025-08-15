# build 디렉토리만 복사해서 실행

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
# COPY build /app/build


# Build the SvelteKit project
RUN npm run build


# EXPOSE 3000

# CMD ["npx", "serve", "-s", "build"]

RUN mkdir -p /mnt/volume && cp -r build/* /mnt/volume/
CMD ["echo", "frontend build complete"]