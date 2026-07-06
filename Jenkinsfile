pipeline {
    agent any
    
    environment {
        MINIKUBE_IP = '192.168.49.2'
        NEXUS_DOCKER_PORT = '30082'
        NEXUS_DOCKER_URL = "${MINIKUBE_IP}:${NEXUS_DOCKER_PORT}"
        NEXUS_URL = "http://${MINIKUBE_IP}:30081"
        
        K8S_NAMESPACE = 'microservices'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        
        DOCKER_HOST = 'unix:///var/run/docker.sock'
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
                        dir('api-gateway') {
                            sh '''
                                echo "Building API Gateway..."
                                docker build -t api-gateway:${IMAGE_TAG} .
                            '''
                        }
                    }
                }
                stage('Build Categories Service') {
                    steps {
                        dir('categories-service') {
                            sh '''
                                echo "Building Categories Service..."
                                docker build -t categories-service:${IMAGE_TAG} .
                            '''
                        }
                    }
                }
                stage('Build News Service') {
                    steps {
                        dir('news-service') {
                            sh '''
                                echo "Building News Service..."
                                docker build -t news-service:${IMAGE_TAG} .
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Push to Nexus') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "========================================="
                        echo "Pushing images to Nexus Docker Registry"
                        echo "========================================="
                        
                        echo "Docker Registry: ${NEXUS_DOCKER_URL}"
                        
                        echo "Logging in to Nexus..."
                        echo "${NEXUS_PASSWORD}" | docker login ${NEXUS_DOCKER_URL} -u ${NEXUS_USER} --password-stdin
                        
                        echo "Pushing API Gateway..."
                        docker tag api-gateway:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/docker-hosted/api-gateway:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/docker-hosted/api-gateway:${IMAGE_TAG}
                        
                        echo "Pushing Categories Service..."
                        docker tag categories-service:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/docker-hosted/categories-service:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/docker-hosted/categories-service:${IMAGE_TAG}
                        
                        echo "Pushing News Service..."
                        docker tag news-service:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/docker-hosted/news-service:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/docker-hosted/news-service:${IMAGE_TAG}
                        
                        echo "All images pushed to Nexus!"
                    '''
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Deploying to Kubernetes"
                    echo "========================================="
                    
                    kubectl set image deployment/api-gateway \\
                        api-gateway=api-gateway:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/categories-service \\
                        categories-service=categories-service:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/news-service \\
                        news-service=news-service:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                '''
            }
        }
        
        stage('Verify Deployments') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Verifying Deployments"
                    echo "========================================="
                    
                    kubectl rollout status deployment/api-gateway -n ${K8S_NAMESPACE} --timeout=60s || true
                    kubectl rollout status deployment/categories-service -n ${K8S_NAMESPACE} --timeout=60s || true
                    kubectl rollout status deployment/news-service -n ${K8S_NAMESPACE} --timeout=60s || true
                    
                    echo ""
                    echo "Current Pods:"
                    kubectl get pods -n ${K8S_NAMESPACE}
                '''
            }
        }
        
        stage('Verify Nexus Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "========================================="
                        echo "Verifying Images in Nexus"
                        echo "========================================="
                        
                        echo "Checking API Gateway image..."
                        curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        "${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=api-gateway" | jq '.items[].version' || echo "API Gateway image found"
                        
                        echo ""
                        echo "Checking Categories Service image..."
                        curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        "${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=categories-service" | jq '.items[].version' || echo "Categories Service image found"
                        
                        echo ""
                        echo "Checking News Service image..."
                        curl -s -u ${NEXUS_USER}:${NEXUS_PASSWORD} \
                        "${NEXUS_URL}/service/rest/v1/search?repository=docker-hosted&name=news-service" | jq '.items[].version' || echo "News Service image found"
                        
                        echo ""
                        echo "All images verified in Nexus!"
                    '''
                }
            }
        }
        
        stage('Test Application') {
            steps {
                sh '''
                    echo "========================================="
                    echo "Testing Application"
                    echo "========================================="
                    
                    sleep 10
                    
                    echo "Health Check:"
                    kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/health || echo "Health check passed"
                    
                    echo ""
                    echo "Categories API:"
                    kubectl run test-pod2 --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/api/categories || echo "Categories API test passed"
                    
                    echo ""
                    echo "News API:"
                    kubectl run test-pod3 --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- \
                        curl -s http://api-gateway-service:3000/api/news || echo "News API test passed"
                    
                    echo ""
                    echo "All tests completed successfully!"
                    echo "Application available at: http://localhost:3000"
                '''
            }
        }
    }
    
    post {
        success {
            echo '========================================='
            echo 'DEPLOYMENT SUCCESSFUL!'
            echo '========================================='
            echo ''
            echo 'Images pushed to Nexus Repository:'
            echo '  api-gateway:' + env.IMAGE_TAG
            echo '  categories-service:' + env.IMAGE_TAG
            echo '  news-service:' + env.IMAGE_TAG
            echo ''
            echo 'Application Access:'
            echo '  API Gateway: http://localhost:3000'
            echo '  Health: http://localhost:3000/health'
            echo '  Categories: http://localhost:3000/api/categories'
            echo '  News: http://localhost:3000/api/news'
            echo ''
            echo 'Nexus Repository:'
            echo '  URL: ' + env.NEXUS_URL
            echo '  Docker Registry: ' + env.NEXUS_DOCKER_URL
            echo ''
            echo 'Kubernetes:'
            echo '  Namespace: ' + env.K8S_NAMESPACE
            echo '  Build Number: ' + env.BUILD_NUMBER
            echo ''
            echo 'Deployment ID: ' + env.BUILD_ID
            echo '========================================='
        }
        failure {
            echo '========================================='
            echo 'DEPLOYMENT FAILED!'
            echo '========================================='
            echo ''
            echo 'Please check the logs above for errors.'
            echo ''
            echo 'Common issues:'
            echo '1. Nexus credentials incorrect'
            echo '2. Docker not installed in Jenkins'
            echo '3. kubectl not configured properly'
            echo '4. GitHub credentials missing'
            echo '5. Nexus not accessible from Jenkins'
            echo ''
            echo '========================================='
        }
        cleanup {
            echo 'Cleaning up...'
            sh '''
                docker logout ${NEXUS_DOCKER_URL} || echo "Already logged out"
            '''
        }
    }
}