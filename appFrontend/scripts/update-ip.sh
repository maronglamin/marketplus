#!/bin/bash

# Script to update IP address across all configuration files
# Usage: ./scripts/update-ip.sh <new-ip-address>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <new-ip-address>"
    echo "Example: $0 192.168.40.48"
    exit 1
fi

NEW_IP=$1
echo "Updating IP address to: $NEW_IP"

# Update frontend app.config.ts
echo "Updating frontend app.config.ts..."
sed -i '' "s/localIp: '.*'/localIp: '$NEW_IP'/g" app.config.ts

# Update frontend environment config
echo "Updating frontend environment config..."
sed -i '' "s/192\.168\.[0-9]\+\.[0-9]\+/$NEW_IP/g" src/config/env.ts

# Update API config file
echo "Updating API config..."
sed -i '' "s/192\.168\.[0-9]\+\.[0-9]\+/$NEW_IP/g" src/api/config.ts

# Update backend .env file
echo "Updating backend .env file..."
cd ../appBackend
sed -i '' "s/192\.168\.[0-9]\+\.[0-9]\+/$NEW_IP/g" .env

echo "IP address updated successfully!"
echo "Please restart your backend server for changes to take effect."
echo "Frontend changes will take effect on next build/restart." 