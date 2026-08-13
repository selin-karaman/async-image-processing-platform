# DevOps Technical Assessment: Asynchronous Image Upload & Processing System

## Overview
This repository contains a multi-service web application designed to upload user-submitted images to a MinIO Object Storage cluster. Upon upload, the system records image metadata in MongoDB and publishes an event to RabbitMQ, which triggers an asynchronous background worker to generate image thumbnails and update the database.

The application contains pre-configured codebases for the following services:
1. **Frontend**: An Angular-based client interface.
2. **Backend**: An Express.js Node application utilizing TypeScript.
3. **Worker**: An asynchronous background image-processing worker built on Node.js and TypeScript.
4. **MinIO Cluster**: Object storage configured for distributed data replication.

Your primary objective is to containerize these services, design a resilient orchestration environment, and establish a secure routing gateway to expose the application to the external network.

---

## Key Deliverables & Requirements
Candidates are expected to complete the following tasks:

1. **Service Containerization**:
   - Write production-ready `Dockerfile` configurations for the **Frontend**, **Backend**, and **Worker** services. Ensure appropriate optimization practices (e.g., multi-stage builds).
2. **Container Orchestration**:
   - Construct a `docker-compose.yml` configuration to orchestrate all services under a single environment.
   - Provision **MongoDB** and **RabbitMQ** (with its management interface) as managed services within the Docker Compose network.
3. **MinIO Storage Provisioning**:
   - Deploy the MinIO distributed cluster based on the reference architecture link provided in [minio-link.txt]. The reference layout should be deployed without modifications to the storage architecture.
4. **Environment Configuration**:
   - Configure inter-service communication securely utilizing **Environment Variables** within the compose topology. No direct application code modifications are required.
5. **Deployment Environment**:
   - The entire containerized system must be deployed and validated on **KoçSistem Internal Servers**.
6. **Git Version Control & Workflow**:
   - Track all progress using Git and host the repository on GitHub.
   - Candidates are required to write descriptive commits and push their changes incrementally as they progress through each phase of the setup (e.g., Dockerfiles creation, database provisioning, Nginx configuration).

---

## Services & Environment Configurations

### 1. Backend Service
The Backend service processes incoming multipart file uploads, uploads the original binary files to MinIO, creates a database record in MongoDB with a `pending` state, and publishes a resizing job event to RabbitMQ.

The service expects the following environment variables:
* `PORT`: The network port on which the Express server listens (e.g., `4000`).
* `ENDPOINT`: The internal MinIO cluster endpoint (e.g., `http://minio-nginx:9000`).
* `BUCKET`: The target S3/MinIO bucket name for image storage.
* `ACCESS_KEY_ID`: MinIO S3 credentials access key.
* `SECRET_ACCESS_KEY`: MinIO S3 credentials secret key.
* `MONGO_URI`: MongoDB connection string (e.g., `mongodb://admin:secret@mongodb:27017/metadata?authSource=admin`).
* `RABBITMQ_URI`: RabbitMQ AMQP connection string (e.g., `amqp://admin:secret@rabbitmq:5672`).

### 2. Worker Service
The Worker background service consumes tasks from the `image-resize` queue in RabbitMQ, retrieves the original image from MinIO, generates a `150x150` thumbnail using the `jimp` processor, uploads the thumbnail back to MinIO, and updates the MongoDB document status to `processed` along with the corresponding thumbnail URL.

The service expects the following environment variables:
* `ENDPOINT`: The internal MinIO cluster endpoint.
* `BUCKET`: The target S3/MinIO bucket name.
* `ACCESS_KEY_ID`: MinIO S3 credentials access key.
* `SECRET_ACCESS_KEY`: MinIO S3 credentials secret key.
* `MONGO_URI`: MongoDB connection string.
* `RABBITMQ_URI`: RabbitMQ AMQP connection string.

### 3. Global Nginx Reverse Proxy / API Gateway
To protect the internal network perimeter, you must configure a global Nginx reverse proxy service that acts as the single entry point for all client traffic:
* Expose public ports: `80` (HTTP web traffic), `8000` (MinIO API proxy), and `8001` (MinIO console proxy).
* Route traffic incoming on Port `80`:
  - Static frontend assets -> Frontend container.
  - API requests (prefixed with `/api`) -> Backend container.
* Proxy incoming traffic on Port `8000` and `8001` to the internal `minio-nginx` load balancer on Ports `9000` and `9001` respectively.

---

## System Architecture
The diagram below illustrates the target multi-container system architecture. Color blocks denote distinct service groups managed via Docker Compose.

<br></br>
<div style="display: flex; align-items: center; justify-content:center; flex-direction: column">
  <h3>System Architecture</h3>
  <img src="architecture.png" alt="System Architecture Diagram" style="width:550px;"/>
</div>