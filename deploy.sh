#!/bin/bash
# Chimichanga/Reading Wrangler FTP Deployment Script

# Load environment variables if .env.deploy exists
if [ -f .env.deploy ]; then
    source .env.deploy
fi

# Ensure credentials exist
HOST="otbdesign.com"
USER="chimichanga@otbdesign.com"

if [ -z "$FTP_PASSWORD" ]; then
    echo "Error: FTP_PASSWORD is not set."
    echo "Please set it in your environment or in a .env.deploy file."
    exit 1
fi

echo "Deploying Reading Wrangler via FTP to $HOST..."

# Use curl to upload files
for file in index.html style.css app.js manifest.json sw.js; do
    echo "Uploading $file..."
    curl -s -T "$file" "ftp://$HOST/" --user "$USER:$FTP_PASSWORD"
    if [ $? -eq 0 ]; then
        echo "Successfully uploaded $file"
    else
        echo "Failed to upload $file"
    fi
done

echo "Uploading API directory..."
for file in api/config.php api/setup_db.php api/api.php; do
    echo "Uploading $file..."
    curl -s --ftp-create-dirs -T "$file" "ftp://$HOST/$file" --user "$USER:$FTP_PASSWORD"
    if [ $? -eq 0 ]; then
        echo "Successfully uploaded $file"
    else
        echo "Failed to upload $file"
    fi
done

echo "Deployment finished."
