"""
Post Service Configuration
MSA 환경에서 Post 서비스의 설정을 관리합니다.
"""

import os

class Config:
    # 보안 키 (운영 환경에서는 반드시 환경 변수로 설정)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 데이터베이스 연결 (MySQL 우선, SQLite 폴백)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///post_service.db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MySQL 연결 풀 설정
    if 'mysql' in (os.environ.get('DATABASE_URL') or ''):
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': 10,
            'pool_recycle': 3600,
            'pool_pre_ping': True
        }
    
    # MSA 서비스 URL (User, Notification 서비스 연동용)
    USER_SERVICE_URL = os.environ.get('USER_SERVICE_URL', 'http://localhost:8081')
    NOTIFICATION_SERVICE_URL = os.environ.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8082')
    ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
    
    # MinIO 설정
    MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT', 'http://localhost:9000')
    MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY', 'minioadmin')
    MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY', 'minioadmin')
    MINIO_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'post-images')

class TestConfig(Config):
    """테스트용 설정"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # SQLite는 pool 옵션을 지원하지 않으므로 제거
    SQLALCHEMY_ENGINE_OPTIONS = {}

