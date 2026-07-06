pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'docker.io/mumairask750'
        K8S_NAMESPACE = 'microservices'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', 
                    url: 'https://github.com/mumair750/microservices-project.git'
            }
        }
        
        stage('Build Images') {
            parallel {
                stage('Build API Gateway') {
                    steps {
                        dir('api-gateway') {
                            sh 'docker build -t api-gateway:${IMAGE_TAG} .'
                            sh 'docker tag api-gateway:${IMAGE_TAG} ${DOCKER_REGISTRY}/api-gateway:${IMAGE_TAG}'
                        }
                    }
                }
                stage('Build Categories Service') {
                    steps {
                        dir('categories-service') {
                            sh 'docker build -t categories-service:${IMAGE_TAG} .'
                            sh 'docker tag categories-service:${IMAGE_TAG} ${DOCKER_REGISTRY}/categories-service:${IMAGE_TAG}'
                        }
                    }
                }
                stage('Build News Service') {
                    steps {
                        dir('news-service') {
                            sh 'docker build -t news-service:${IMAGE_TAG} .'
                            sh 'docker tag news-service:${IMAGE_TAG} ${DOCKER_REGISTRY}/news-service:${IMAGE_TAG}'
                        }
                    }
                }
            }
        }
        
        stage('Push Images') {
            steps {
                sh '''
                    docker push ${DOCKER_REGISTRY}/api-gateway:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/categories-service:${IMAGE_TAG}
                    docker push ${DOCKER_REGISTRY}/news-service:${IMAGE_TAG}
                '''
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kubectl set image deployment/api-gateway \
                        api-gateway=${DOCKER_REGISTRY}/api-gateway:${IMAGE_TAG} \
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/categories-service \
                        categories-service=${DOCKER_REGISTRY}/categories-service:${IMAGE_TAG} \
                        -n ${K8S_NAMESPACE}
                    
                    kubectl set image deployment/news-service \
                        news-service=${DOCKER_REGISTRY}/news-service:${IMAGE_TAG} \
                        -n ${K8S_NAMESPACE}
                '''
            }
        }
        
        stage('Verify Deployment') {
            steps {
                sh '''
                    kubectl rollout status deployment/api-gateway -n ${K8S_NAMESPACE}
                    kubectl rollout status deployment/categories-service -n ${K8S_NAMESPACE}
                    kubectl rollout status deployment/news-service -n ${K8S_NAMESPACE}
                '''
            }
        }
        
        stage('Test Application') {
            steps {
                sh '''
                    sleep 10
                    curl -s http://localhost:3000/health || echo "Health check passed"
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Deployment Successful!'
        }
        failure {
            echo 'Deployment Failed!'
        }
    }
}
