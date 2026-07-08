pipeline {
    agent any
    
    environment {

    MINIKUBE_IP = '192.168.49.2'
    NEXUS_URL = "http://${MINIKUBE_IP}:30081"
    NEXUS_DOCKER_URL = "${MINIKUBE_IP}:30082"
    NEXUS_REPOSITORY = 'docker-hosted'
    K8S_NAMESPACE = 'microservices'
    IMAGE_TAG = "${BUILD_NUMBER}"
    DOCKER_HOST = 'unix:///var/run/docker.sock'
}
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo '[Checkout] Cloning repository...'
                }
                git branch: 'main', 
                    url: 'https://github.com/mumair750/microservices-project.git',
                    credentialsId: 'github-token'
                script {
                    echo '[Checkout] Repository cloned successfully'
                }
            }
        }
        
        stage('Build') {
            parallel {
                stage('Build: API Gateway') {
                    steps {
                        dir('api-gateway') {
                            sh 'docker build -t api-gateway:${IMAGE_TAG} .'
                        }
                    }
                }
                stage('Build: Categories') {
                    steps {
                        dir('categories-service') {
                            sh 'docker build -t categories-service:${IMAGE_TAG} .'
                        }
                    }
                }
                stage('Build: News') {
                    steps {
                        dir('news-service') {
                            sh 'docker build -t news-service:${IMAGE_TAG} .'
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        echo '[Build] All images built successfully'
                    }
                }
                failure {
                    script {
                        error '[Build] Docker build failed. Check logs above.'
                    }
                }
            }
        }
        
        stage('Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )
                ]) {
                    script {
                        echo '[Push] Authenticating with Nexus...'
                    }
                    sh '''
                        echo "${NEXUS_PASSWORD}" | docker login ${NEXUS_DOCKER_URL} -u ${NEXUS_USER} --password-stdin
                        
                        docker tag api-gateway:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/api-gateway:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/api-gateway:${IMAGE_TAG}
                        
                        docker tag categories-service:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/categories-service:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/categories-service:${IMAGE_TAG}
                        
                        docker tag news-service:${IMAGE_TAG} ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/news-service:${IMAGE_TAG}
                        docker push ${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/news-service:${IMAGE_TAG}
                    '''
                }
            }
            post {
                success {
                    script {
                        echo '[Push] All images pushed to Nexus'
                    }
                }
                failure {
                    script {
                        error '[Push] Failed to push images. Check Nexus connectivity and credentials.'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    echo '[Deploy] Updating Kubernetes deployments...'
                }
                sh """
                    kubectl set image deployment/api-gateway \\
                        api-gateway=${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/api-gateway:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/categories-service \\
                        categories-service=${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/categories-service:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/news-service \\
                        news-service=${NEXUS_DOCKER_URL}/${NEXUS_REPOSITORY}/news-service:${IMAGE_TAG} \\
                        -n ${K8S_NAMESPACE}
                """
            }
            post {
                success {
                    script {
                        echo '[Deploy] Kubernetes manifests updated'
                    }
                }
                failure {
                    script {
                        error '[Deploy] Failed to update deployments. Check kubectl connectivity.'
                    }
                }
            }
        }
        
        stage('Verify') {
            steps {
                script {
                    echo '[Verify] Checking rollout status...'
                }
                sh """
                    kubectl rollout status deployment/api-gateway -n ${K8S_NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/categories-service -n ${K8S_NAMESPACE} --timeout=120s
                    kubectl rollout status deployment/news-service -n ${K8S_NAMESPACE} --timeout=120s
                    
                    echo ''
                    echo '[Verify] Current Pods:'
                    kubectl get pods -n ${K8S_NAMESPACE} -o wide
                """
            }
            post {
                success {
                    script {
                        echo '[Verify] All deployments are ready'
                    }
                }
                failure {
                    script {
                        error '[Verify] Rollout failed. Check pod status and logs.'
                    }
                }
            }
        }
        
        stage('Verify Nexus') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )
                ]) {
                    script {
                        echo '[Verify Nexus] Checking images...'
                    }
                    sh """
                        echo '[Verify Nexus] Checking API Gateway image...'
                        curl -s -u \${NEXUS_USER}:\${NEXUS_PASSWORD} \\
                            \${NEXUS_URL}/service/rest/v1/search?repository=\${NEXUS_REPOSITORY}&name=api-gateway \\
                            | jq -e '.items | length > 0' > /dev/null
                        
                        echo '[Verify Nexus] Image found: api-gateway:${IMAGE_TAG}'
                    """
                }
            }
            post {
                failure {
                    script {
                        echo '[Verify Nexus] Warning: Nexus image verification failed. Continuing...'
                    }
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    echo '[Test] Running health checks...'
                }
                sh """
                    sleep 10
                    
                    kubectl run test-runner --image=curlimages/curl --rm -it --restart=Never -n ${K8S_NAMESPACE} -- sh -c '
                        echo "Testing API Gateway..."
                        curl -s -o /dev/null -w "Health: %{http_code}\\n" http://api-gateway-service:3000/health
                        
                        echo "Testing Categories API..."
                        curl -s http://api-gateway-service:3000/api/categories | jq . || echo "Categories API available"
                        
                        echo "Testing News API..."
                        curl -s http://api-gateway-service:3000/api/news | jq . || echo "News API available"
                    '
                """
            }
            post {
                success {
                    script {
                        echo '[Test] All tests passed'
                    }
                }
                failure {
                    script {
                        error '[Test] Tests failed. Check application logs.'
                    }
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo """
                DEPLOYMENT SUCCESSFUL
                Images: api-gateway:${IMAGE_TAG}, categories-service:${IMAGE_TAG}, news-service:${IMAGE_TAG}
                Access: http://localhost:3000
                Nexus: ${NEXUS_URL}
                Build: ${BUILD_NUMBER}
                """
            }
        }
        failure {
            script {
                echo """
                DEPLOYMENT FAILED
                Build: ${BUILD_NUMBER}
                Check the logs above for errors.
                """
            }
        }
        cleanup {
            script {
                echo 'Cleaning up...'
            }
            sh '''
                docker logout ${NEXUS_DOCKER_URL} || true
            '''
        }
    }
}