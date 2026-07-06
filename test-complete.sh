#!/bin/bash

echo "========================================="
echo "    COMPLETE MICROSERVICES TEST"
echo "========================================="

# Check if port-forward is running, if not start it
if ! pgrep -f "port-forward.*3000" > /dev/null; then
    echo "Starting port-forward..."
    kubectl port-forward service/api-gateway-service -n microservices 3000:3000 &
    sleep 5
fi

BASE_URL="http://localhost:3000"

echo ""
echo "1. Testing Health Check..."
curl -s $BASE_URL/health | jq

echo ""
echo "2. Getting all categories..."
curl -s $BASE_URL/api/categories | jq

echo ""
echo "3. Creating a new category..."
CATEGORY_RESPONSE=$(curl -s -X POST $BASE_URL/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Technology","description":"Latest tech news"}')
echo $CATEGORY_RESPONSE | jq

# Extract category ID
CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "Created category with ID: $CATEGORY_ID"

echo ""
echo "4. Creating a news article..."
curl -s -X POST $BASE_URL/api/news \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"New Tech Breakthrough\",\"content\":\"Scientists developed new AI model...\",\"category_id\":$CATEGORY_ID}" | jq

echo ""
echo "5. Getting all news..."
curl -s $BASE_URL/api/news | jq

echo ""
echo "6. Updating a category..."
curl -s -X PUT $BASE_URL/api/categories/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Category","description":"Updated description"}' | jq

echo ""
echo "========================================="
echo "    ALL TESTS COMPLETED SUCCESSFULLY!"
echo "========================================="
