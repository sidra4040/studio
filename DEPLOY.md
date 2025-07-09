# Deploying DojoGPT to an Ubuntu Server

This guide provides step-by-step instructions for deploying your Next.js application to a production environment on an Ubuntu server. We will use `nginx` as a reverse proxy and `pm2` as a process manager to keep the application running.

## Prerequisites

- An Ubuntu server (20.04 or later).
- A user with `sudo` privileges.
- SSH access to your server.
- A domain name pointing to your server's IP address (optional, but recommended for HTTPS).

---

## Part 1: Server Setup & Prerequisites

First, SSH into your server and install the necessary software.

```bash
ssh your_user@your_server_ip
```

1.  **Update System Packages**

    ```bash
    sudo apt update
    sudo apt upgrade -y
    ```

2.  **Install Nginx**
    Nginx will act as a reverse proxy, handling incoming web traffic and directing it to our Next.js application.

    ```bash
    sudo apt install nginx -y
    ```

    Allow Nginx through the firewall:
    ```bash
    sudo ufw allow 'Nginx Full'
    sudo ufw enable
    ```

3.  **Install Node.js**
    We'll use Node Version Manager (`nvm`) to install Node.js. This makes it easy to manage different Node versions.

    ```bash
    # Download and run the nvm installation script
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

    # Load nvm into the current shell session
    source ~/.bashrc

    # Install the latest Long-Term Support (LTS) version of Node.js
    nvm install --lts
    ```
    Verify the installation:
    ```bash
    node -v  # Should output a version like v20.x.x
    npm -v   # Should output a version like v10.x.x
    ```

4.  **Install PM2 Process Manager**
    PM2 is a process manager for Node.js applications that will keep our app running in the background and automatically restart it if it crashes.

    ```bash
    npm install pm2 -g
    ```

---

## Part 2: Application Deployment

Now, let's get your application code onto the server and set it up for production.

1.  **Clone Your Repository**
    Clone your project from your Git repository.

    ```bash
    # Replace with your actual repository URL
    git clone https://github.com/your-username/your-repo-name.git

    # Navigate into the project directory
    cd your-repo-name
    ```

2.  **Install Project Dependencies**

    ```bash
    npm install
    ```

3.  **Create Production Environment File**
    Create a `.env` file for your production environment variables. **Do not commit this file to version control.**

    ```bash
    cp .env.example .env
    ```

    Now, edit the file and fill in your production secrets:
    ```bash
    nano .env
    ```
    You will need to add all the required API keys and URLs, just like you did for your local setup (`DEFECTDOJO_API_URL`, `DEFECTDOJO_API_KEY`, etc.).

4.  **Build the Application**
    Create a production-ready build of your Next.js app.

    ```bash
    npm run build
    ```

5.  **Start the Application with PM2**
    The `npm start` command runs `next start`, which serves the production build, typically on port 3000.

    ```bash
    pm2 start npm --name "dojogpt" -- start
    ```

    You can check the status of your app with:
    ```bash
    pm2 list
    ```

    To view logs:
    ```bash
    pm2 logs dojogpt
    ```

---

## Part 3: Configure Nginx as a Reverse Proxy

Nginx will listen for public traffic on port 80 and forward it to your app running on port 3000.

1.  **Create a New Nginx Configuration File**

    ```bash
    # Replace 'your_domain' with your actual domain name or server IP
    sudo nano /etc/nginx/sites-available/your_domain
    ```

2.  **Add the Server Block Configuration**
    Paste the following configuration into the file. This tells Nginx how to handle requests for your site.

    ```nginx
    server {
        listen 80;
        listen [::]:80;

        # Replace with your domain name or server IP address
        server_name your_domain www.your_domain;

        location / {
            # Forward requests to your Next.js app running on port 3000
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    Save the file and exit (`Ctrl+X`, then `Y`, then `Enter`).

3.  **Enable the Site and Restart Nginx**
    Create a symbolic link from your new config file to the `sites-enabled` directory.

    ```bash
    sudo ln -s /etc/nginx/sites-available/your_domain /etc/nginx/sites-enabled/
    ```

    Test your Nginx configuration for syntax errors:
    ```bash
    sudo nginx -t
    ```

    If the test is successful, restart Nginx to apply the changes:
    ```bash
    sudo systemctl restart nginx
    ```

---

## Part 4: Accessing Your App

Your application should now be accessible by navigating to your server's IP address or domain name in a web browser.

For a more professional and secure deployment, it is highly recommended to set up HTTPS using a free SSL certificate from **Let's Encrypt**. You can do this easily using the `certbot` tool:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install an SSL certificate
sudo certbot --nginx -d your_domain -d www.your_domain
```
Certbot will automatically update your Nginx configuration to handle HTTPS traffic.
