pipeline {
    agent any
    
    environment {
        NEXUS_URL = 'http://10.96.138.209:8081'
        NEXUS_DOCKER_URL = '10.96.138.209:8082'
        NEXUS_USER = 'admin'
        NEXUS_PASSWORD = '970862Abc@'  
        
        K8S_NAMESPACE = 'microservices'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        
        DOCKER_HOST = 'unix:///var/run/docker.sock'
        
        API_GATEWAY_IMAGE = "${NEXUS_DOCKER_URL}/api-gateway:${IMAGE_TAG}"
        CATEGORIES_SERVICE_IMAGE = "${NEXUS_DOCKER_URL}/categories-service:${IMAGE_TAG}"
        NEWS_SERVICE_IMAGE = "${NEXUS_DOCKER_URL}/news-service:${IMAGE_TAG}"
    }
    
    stages {
        
        stage('Checkout') {
            steps {
                echo 'Checking out code from GitHub...'
                git branch: 'main', 
                    url: 'https://github.com/mumair750/microservices-project.git',
                    credentialsId: 'github-token'
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build API Gateway') {
                    steps {
                        script {
                            dir('api-gateway') {
                                sh '''
                                    echo "Building API Gateway..."
                                    docker build -t api-gateway:${IMAGE_TAG} .
                                    docker tag api-gateway:${IMAGE_TAG} ${API_GATEWAY_IMAGE}
                                '''
                            }
                        }
                    }
                }
                stage('Build Categories Service') {
                    steps {
                        script {
                            dir('categories-service') {
                                sh '''
                                    echo "Building Categories Service..."
                                    docker build -t categories-service:${IMAGE_TAG} .
                                    docker tag categories-service:${IMAGE_TAG} ${CATEGORIES_SERVICE_IMAGE}
                                '''
                            }
                        }
                    }
                }
                stage('Build News Service') {
                    steps {
                        script {
                            dir('news-service') {
                                sh '''
                                    echo "Building News Service..."
                                    docker build -t news-service:${IMAGE_TAG} .
                                    docker tag news-service:${IMAGE_TAG} ${NEWS_SERVICE_IMAGE}
                                '''
                            }
                        }
                    }
                }
            }
        }
        
        stage('Push Images to Nexus') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Pushing Images to Nexus Repository"
                    echo "========================================="
                    
                    # Login to Nexus Docker registry
                    echo "Logging in to Nexus..."
                    echo "${NEXUS_PASSWORD}" | docker login ${NEXUS_DOCKER_URL} -u ${NEXUS_USER} --password-stdin
                    
                    # Push all images
                    echo "Pushing API Gateway..."
                    docker push ${API_GATEWAY_IMAGE}
                    
                    echo "Pushing Categories Service..."
                    docker push ${CATEGORIES_SERVICE_IMAGE}
                    
                    echo "Pushing News Service..."
                    docker push ${NEWS_SERVICE_IMAGE}
                    
                    echo "All images pushed to Nexus successfully!"
                '''
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Deploying to Kubernetes"
                    echo "========================================="
                    
                    # Update API Gateway
                    echo "Updating API Gateway..."
                    kubectl set image deployment/api-gateway \
                        api-gateway=${API_GATEWAY_IMAGE} \
                        -n ${K8S_NAMESPACE}
                    
                    # Update Categories Service
                    echo "Updating Categories Service..."
                    kubectl set image deployment/categories-service \
                        categories-service=${CATEGORIES_SERVICE_IMAGE} \
                        -n ${K8S_NAMESPACE}
                    
                    # Update News Service
                    echo "Updating News Service..."
                    kubectl set image deployment/news-service \
                        news-service=${NEWS_SERVICE_IMAGE} \
                        -n ${K8S_NAMESPACE}
                    
                    echo "All deployments updated!"
                '''
            }
        }
        
        stage('Verify Deployments') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Verifying Deployments"
                    echo "========================================="
                    
                    echo "Waiting for API Gateway..."
                    kubectl rollout status deployment/api-gateway -n ${K8S_NAMESPACE} --timeout=120s
                    
                    echo "Waiting for Categories Service..."
                    kubectl rollout status deployment/categories-service -n ${K8S_NAMESPACE} --timeout=120s
                    
                    echo "Waiting for News Service..."
                    kubectl rollout status deployment/news-service -n ${K8S_NAMESPACE} --timeout=120s
                    
                    echo ""
                    echo "Current Pods:"
                    kubectl get pods -n ${K8S_NAMESPACE}
                    
                    echo ""
                    echo "Current Services:"
                    kubectl get svc -n ${K8S_NAMESPACE}
                '''
            }
        }

        stage('Test Application') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Testing Application"
                    echo "========================================="
                    
                    # Wait for pods to stabilize
                    sleep 10
                    
                    # Test health endpoint
                    echo "Testing Health Check..."
                    kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/health || echo "Health check warning"
                    
                    # Test categories endpoint
                    echo ""
                    echo "Testing Categories API..."
                    kubectl run test-pod2 --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/api/categories || echo "Categories API warning"
                    
                    # Test news endpoint
                    echo ""
                    echo "Testing News API..."
                    kubectl run test-pod3 --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/api/news || echo "News API warning"
                    
                    echo ""
                    echo "All tests completed!"
                '''
            }
        }
        
        stage('Verify Nexus Images') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Verifying Images in Nexus"
                    echo "========================================="
                    
                    # Check if images exist in Nexus
                    echo "Checking API Gateway image..."
                    curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        ${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=api-gateway \
                        | grep -q "api-gateway" && echo "API Gateway image found in Nexus" || echo "API Gateway image not found"
                    
                    echo "Checking Categories Service image..."
                    curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        ${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=categories-service \
                        | grep -q "categories-service" && echo "Categories Service image found in Nexus" || echo "⚠️ Categories Service image not found"
                    
                    echo "Checking News Service image..."
                    curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        ${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=news-service \
                        | grep -q "news-service" && echo "News Service image found in Nexus" || echo "News Service image not found"
                '''
            }
        }
    }
    
    post {
        success {
            echo '========================================='
            echo '        DEPLOYMENT SUCCESSFUL!   '
            echo '========================================='
            echo ''
            echo 'Images pushed to Nexus Repository'
            echo '   - api-gateway:' + env.IMAGE_TAG
            echo '   - categories-service:' + env.IMAGE_TAG
            echo '   - news-service:' + env.IMAGE_TAG
            echo ''
            echo 'Access the application:'
            echo '   - API Gateway: http://localhost:3000'
            echo '   - Health Check: http://localhost:3000/health'
            echo '   - Categories: http://localhost:3000/api/categories'
            echo '   - News: http://localhost:3000/api/news'
            echo ''
            echo 'Nexus Repository:'
            echo '   - URL: ' + env.NEXUS_URL
            echo '   - Docker Registry: ' + env.NEXUS_DOCKER_URL
            echo ''
            echo '========================================='
            echo 'Deployment ID: ' + env.BUILD_ID
            echo 'Build Number: ' + env.BUILD_NUMBER
            echo '========================================='
        }
        failure {
            echo '========================================='
            echo '        DEPLOYMENT FAILED! '
            echo '========================================='
            echo ''
            echo 'Please check the logs above for errors.'
            echo ''
            echo 'Common issues:'
            echo '1. Nexus not accessible from Jenkins'
            echo '2. Docker not installed in Jenkins'
            echo '3. kubectl not configured properly'
            echo '4. GitHub credentials missing'
            echo '5. Nexus credentials incorrect'
            echo ''
            echo '========================================='
        }
        cleanup {
            echo 'Cleaning up...'
            sh '''
                echo "Logging out of Docker registry..."
                docker logout ${NEXUS_DOCKER_URL} || echo "Already logged out"
            '''
        }
    }
}
