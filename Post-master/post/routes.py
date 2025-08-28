"""
Post Service API Routes
MSA 환경에서 독립적으로 동작하는 Post 서비스 API입니다.
"""

import boto3
import os
from flask import Blueprint, request, jsonify, abort, current_app
from .models import db, Post, Like, Category, User
from .services import PostService
from .validators import PostValidator
# from .utils import jwt_required  # 임시로 주석 처리
import uuid
import requests
import json
from werkzeug.utils import secure_filename
from PIL import Image
import io
from datetime import datetime
from functools import wraps

bp = Blueprint('api', __name__, url_prefix='/api/v1')

# AWS Cognito 설정
cognito_client = boto3.client(
    'cognito-idp',
    region_name=os.getenv('COGNITO_REGION', 'ap-northeast-2'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID', 'ap-northeast-2_nneGIIVuJ')
CLIENT_ID = os.getenv('COGNITO_CLIENT_ID', '2v16jp80jce0c40neuuhtlgg8t')

# ============================================================================
# 유틸리티 함수들
# ============================================================================

def get_config():
    """MSA 서비스 설정값 가져오기"""
    from flask import current_app
    return {
        'USER_SERVICE_URL': current_app.config.get('USER_SERVICE_URL', 'http://localhost:8081'),
        'NOTIFICATION_SERVICE_URL': current_app.config.get('NOTIFICATION_SERVICE_URL', 'http://localhost:8082'),
        'ENVIRONMENT': current_app.config.get('ENVIRONMENT', 'development')
    }

def call_user_service(endpoint, method="GET", data=None, headers=None):
    """User 서비스 호출 (MSA 통신)"""
    try:
        config = get_config()
        url = f"{config['USER_SERVICE_URL']}{endpoint}"
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=5)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=5)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            current_app.logger.warning(f"User service call failed: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"User service connection error: {str(e)}")
        return None

def validate_user_exists(user_id):
    """사용자 존재 여부 확인 (개발 환경에서는 검증 건너뛰기)"""
    if get_config()['ENVIRONMENT'] == 'development':
        current_app.logger.info("Development mode: Skipping user validation")
        return True
    
    try:
        user_info = call_user_service(f"/api/users/{user_id}")
        return user_info is not None
    except Exception as e:
        current_app.logger.error(f"User service validation failed: {str(e)}")
        return False

def notify_user_activity(user_id, activity_type, data):
    """사용자 활동 알림 (개발 환경에서는 알림 건너뛰기)"""
    if get_config()['ENVIRONMENT'] == 'development':
        current_app.logger.info("Development mode: Skipping notification")
        return
    
    try:
        notification_data = {
            "user_id": user_id,
            "activity_type": activity_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        response = requests.post(
            f"{get_config()['NOTIFICATION_SERVICE_URL']}/api/notifications",
            json=notification_data,
            timeout=5
        )
        
        if response.status_code == 200:
            current_app.logger.info(f"Notification sent: {activity_type}")
        else:
            current_app.logger.warning(f"Notification failed: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Notification service error: {str(e)}")

def generate_id():
    """32자리 UUID 생성"""
    return str(uuid.uuid4()).replace('-', '')

def allowed_file(filename):
    """허용된 이미지 파일 형식 확인"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_image_locally(file, post_id):
    """로컬에 이미지 저장 (개발 환경용, 운영에서는 S3 사용)"""
    upload_folder = os.path.join(current_app.root_path, 'uploads', str(post_id))
    os.makedirs(upload_folder, exist_ok=True)
    
    filename = secure_filename(file.filename)
    timestamp = str(uuid.uuid4())[:8]
    name, ext = os.path.splitext(filename)
    safe_filename = f"{name}_{timestamp}{ext}"
    
    file_path = os.path.join(upload_folder, safe_filename)
    file.save(file_path)
    
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            mime_type = f"image/{img.format.lower()}"
    except Exception as e:
        width, height = None, None
        mime_type = file.content_type or 'application/octet-stream'
    
    relative_path = f"/uploads/{post_id}/{safe_filename}"
    
    return {
        's3_url': relative_path,
        'mime_type': mime_type,
        'width': width,
        'height': height
    }

# ============================================================================
# API 응답 표준화
# ============================================================================

def api_response(data=None, message="Success", status_code=200, meta=None):
    """표준화된 API 응답 생성"""
    response = {
        "success": status_code < 400,
        "message": message,
        "data": data
    }
    
    if meta:
        response["meta"] = meta
    
    return jsonify(response), status_code

def api_error(message="Error", status_code=400, details=None):
    """표준화된 API 에러 응답 생성"""
    response = {
        "success": False,
        "message": message,
        "error": {
            "code": status_code,
            "details": details
        }
    }
    
    return jsonify(response), status_code

# ============================================================================
# 게시글 API 엔드포인트
# ============================================================================

@bp.route('/posts', methods=['GET'])
def list_posts():
    """
    게시글 목록 조회
    ---
    tags:
      - Posts
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: 페이지 번호
      - name: per_page
        in: query
        type: integer
        default: 10
        maximum: 50
        description: 페이지당 항목 수
      - name: q
        in: query
        type: string
        description: 검색어 (제목, 내용)
      - name: visibility
        in: query
        type: string
        enum: [PUBLIC, PRIVATE, UNLISTED]
        default: PUBLIC
        description: 게시글 공개 설정
      - name: status
        in: query
        type: string
        enum: [PUBLISHED, DRAFT, DELETED]
        default: PUBLISHED
        description: 게시글 상태
    responses:
      200:
        description: 게시글 목록 조회 성공
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
            data:
              type: array
              items:
                $ref: '#/definitions/Post'
            meta:
              type: object
              properties:
                page:
                  type: integer
                per_page:
                  type: integer
                total:
                  type: integer
                pages:
                  type: integer
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 10)), 50)
        q = request.args.get('q', '').strip()
        visibility = request.args.get('visibility', 'PUBLIC')
        status = request.args.get('status', None)  # 기본값 제거하여 모든 상태 조회
        category_id = request.args.get('category_id', None)  # 카테고리 필터
        sort = request.args.get('sort', 'latest')  # 정렬 방식 (latest: 최신순, popular: 인기순)

        query = Post.query.filter_by(visibility=visibility)
        if status:
            query = query.filter_by(status=status)
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if q:
            # SQLite에서는 LIKE 검색 사용
            query = query.filter(
                db.or_(
                    Post.title.like(f'%{q}%'),
                    Post.content_md.like(f'%{q}%')
                )
            )

        # 정렬 적용
        if sort == 'popular':
            query = query.order_by(Post.like_count.desc(), Post.created_at.desc())
        else:  # latest (기본값)
            query = query.order_by(Post.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = [{
            "id": p.id,
            "title": p.title,
            "content": p.content,  # content 필드 추가
            "content_md": p.content_md,
            "content_s3url": p.content_s3url,
            "author": p.author,  # author 필드 추가
            "author_id": p.author_id,
            "category": p.category,  # 카테고리 이름 (문자열)
            "visibility": p.visibility,
            "status": p.status,
            "view_count": p.view_count,
            "like_count": p.like_count,
            "comment_count": p.comment_count,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        } for p in pagination.items]

        meta = {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages
        }

        return api_response(data=items, meta=meta)
        
    except Exception as e:
        current_app.logger.error(f"Error in list_posts: {str(e)}")
        return api_error("게시글 목록 조회 중 오류가 발생했습니다", 500)

# IP 기반 중복 조회 방지를 위한 간단한 메모리 캐시
_view_cache = {}

def _should_increment_view(post_id, client_ip):
    """클라이언트 IP 기반으로 조회수 증가 여부 결정"""
    cache_key = f"{post_id}_{client_ip}"
    current_time = datetime.utcnow()
    
    # 캐시에서 마지막 조회 시간 확인
    if cache_key in _view_cache:
        last_view_time = _view_cache[cache_key]
        # 2분(120초) 이내 재조회 시 증가 방지
        if (current_time - last_view_time).total_seconds() < 120:
            return False
    
    # 조회 시간 업데이트
    _view_cache[cache_key] = current_time
    return True

@bp.route('/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    """
    게시글 단건 조회
    ---
    tags:
      - Posts
    parameters:
      - name: post_id
        in: path
        type: string
        required: true
        description: 게시글 ID
    responses:
      200:
        description: 게시글 조회 성공
        schema:
          $ref: '#/definitions/Post'
      404:
        description: 게시글을 찾을 수 없음
    """
    try:
        post = Post.query.get(post_id)
        if not post:
            return api_error("게시글을 찾을 수 없습니다", 404)
            
        # 클라이언트 IP 기반 중복 조회 방지
        client_ip = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')
        should_increment = _should_increment_view(post_id, client_ip)
        
        if should_increment:
            post.view_count += 1
            db.session.commit()
        
        data = {
            "id": post.id,
            "title": post.title,
            "content": post.content,  # content 필드 추가
            "content_md": post.content_md,
            "content_s3url": post.content_s3url,
            "author": post.author,  # author 필드 추가
            "author_id": post.author_id,
            "category": post.category,  # 카테고리 이름 (문자열)
            "visibility": post.visibility,
            "status": post.status,
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "created_at": post.created_at.isoformat(),
            "updated_at": post.updated_at.isoformat() if post.updated_at else None
        }
        
        return api_response(data=data)
        
    except Exception as e:
        current_app.logger.error(f"Error in get_post: {str(e)}")
        return api_error("게시글 조회 중 오류가 발생했습니다", 500)





@bp.route('/posts', methods=['POST'])
# @jwt_required  # 임시로 주석 처리
def create_post():
    """게시글 작성 - 임시로 인증 없이 가능"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        # 필수 필드 검증
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} 필드가 필요합니다.'}), 400
        
        # 사용자 정보 (임시로 요청에서 추출)
        username = data.get('author', 'Anonymous')
        
        # 게시글 생성
        new_post = Post(
            title=data['title'],
            content=data['content'],
            author=username,
            category=data['category']
        )
        
        db.session.add(new_post)
        db.session.commit()
        
        # 성공 응답
        return jsonify({
            'success': True,
            'message': '게시글이 성공적으로 작성되었습니다.',
            'data': {
                'id': new_post.id,
                'title': new_post.title,
                'content': new_post.content,
                'author': new_post.author,
                'category': new_post.category,
                'created_at': new_post.created_at.isoformat() if new_post.created_at else None
            }
        }), 201
        
    except Exception as e:
        current_app.logger.error(f'게시글 작성 중 오류: {str(e)}')
        db.session.rollback()
        return jsonify({'error': '게시글 작성 중 오류가 발생했습니다.'}), 500

@bp.route('/posts/<post_id>', methods=['PUT', 'PATCH'])
def update_post(post_id):
    """
    게시글 수정
    ---
    tags:
      - Posts
    parameters:
      - name: post_id
        in: path
        type: string
        required: true
        description: 게시글 ID
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            title:
              type: string
            content_md:
              type: string
            content_s3url:
              type: string
            author_id:
              type: string
            visibility:
              type: string
              enum: [PUBLIC, PRIVATE, UNLISTED]
            status:
              type: string
              enum: [PUBLISHED, DRAFT]
    responses:
      200:
        description: 게시글 수정 성공
      404:
        description: 게시글을 찾을 수 없음
    """
    try:
        post = Post.query.get(post_id)
        if not post:
            return api_error("게시글을 찾을 수 없습니다", 404)
        data = request.get_json(force=True, silent=False)

        if request.method == 'PUT':
            title = (data.get('title') or '').strip()
            content_md = (data.get('content_md') or '').strip()
            content_s3url = data.get('content_s3url', '').strip()
            author_id = data.get('author_id')
            visibility = data.get('visibility', 'PUBLIC')
            status = data.get('status', 'DRAFT')
            
            if not title or not author_id:
                return api_error("제목과 작성자 ID는 필수입니다", 400)
                
            post.title = title
            post.content_md = content_md if content_md else None
            post.content_s3url = content_s3url if content_s3url else None
            post.author_id = author_id
            post.visibility = visibility
            post.status = status
        else:
            if 'title' in data:
                post.title = (data['title'] or '').strip()
            if 'content_md' in data:
                post.content_md = (data['content_md'] or '').strip()
            if 'content_s3url' in data:
                post.content_s3url = (data['content_s3url'] or '').strip()
            if 'author_id' in data:
                post.author_id = data['author_id']
            if 'visibility' in data:
                post.visibility = data['visibility']
            if 'status' in data:
                post.status = data['status']

        db.session.commit()
        return api_response(message="게시글이 성공적으로 수정되었습니다")
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in update_post: {str(e)}")
        return api_error("게시글 수정 중 오류가 발생했습니다", 500)

@bp.route('/posts/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    """
    게시글 삭제
    ---
    tags:
      - Posts
    parameters:
      - name: post_id
        in: path
        type: string
        required: true
        description: 게시글 ID
    responses:
      200:
        description: 게시글 삭제 성공
      404:
        description: 게시글을 찾을 수 없음
    """
    try:
        post = Post.query.get(post_id)
        if not post:
            return api_error("게시글을 찾을 수 없습니다", 404)
        post.status = 'DELETED'
        db.session.commit()
        return api_response(message="게시글이 성공적으로 삭제되었습니다")
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in delete_post: {str(e)}")
        return api_error("게시글 삭제 중 오류가 발생했습니다", 500)

# ============================================================================
# 게시글 반응 API
# ============================================================================

@bp.route('/posts/<post_id>/like', methods=['POST'])
def like_post(post_id):
    """
    게시글 좋아요 (한 유저당 한 게시글에 한 번만)
    ---
    tags:
      - Reactions
    parameters:
      - name: post_id
        in: path
        type: string
        required: true
        description: 게시글 ID
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - user_id
          properties:
            user_id:
              type: string
              description: 사용자 ID
    responses:
      200:
        description: 좋아요 처리 성공
      400:
        description: 잘못된 요청 데이터
      409:
        description: 이미 좋아요를 누른 게시글
    """
    try:
        current_app.logger.info(f"좋아요 요청 - post_id: {post_id}")
        
        post = Post.query.get(post_id)
        if not post:
            current_app.logger.warning(f"게시글을 찾을 수 없습니다: {post_id}")
            return api_error("게시글을 찾을 수 없습니다", 404)
        
        current_app.logger.info(f"게시글 조회 성공: {post.id}")
        
        data = request.get_json(force=True, silent=False)
        current_app.logger.info(f"요청 데이터: {data}")
        
        user_id = data.get('user_id')
        current_app.logger.info(f"추출된 user_id: {user_id}")
        
        if not user_id:
            current_app.logger.warning("사용자 ID가 없습니다")
            return api_error("사용자 ID는 필수입니다", 400)
        
        # 이미 좋아요를 누른 경우
        existing_like = Like.query.filter_by(post_id=post_id, user_id=user_id).first()
        if existing_like:
            # 좋아요 취소
            db.session.delete(existing_like)
            post.like_count = max(0, post.like_count - 1)
            action = "removed"
        else:
            # 새 좋아요 추가
            new_like = Like(post_id=post_id, user_id=user_id)
            db.session.add(new_like)
            post.like_count += 1
            action = "added"
        
        db.session.commit()
        return api_response(data={
            "like_count": post.like_count,
            "is_liked": action == "added",
            "action": action,
            "message": f"좋아요가 {action}되었습니다"
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in like_post: {str(e)}")
        return api_error("좋아요 처리 중 오류가 발생했습니다", 500)

# ============================================================================
# 카테고리 API
# ============================================================================

@bp.route('/categories', methods=['GET'])
def list_categories():
    """
    카테고리 목록 조회
    ---
    tags:
      - Categories
    responses:
      200:
        description: 카테고리 목록 조회 성공
    """
    try:
        categories = Category.query.all()
        items = [{
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "created_at": c.created_at.isoformat()
        } for c in categories]
        
        return api_response(data=items)
        
    except Exception as e:
        current_app.logger.error(f"Error in list_categories: {str(e)}")
        return api_error("카테고리 목록 조회 중 오류가 발생했습니다", 500)

@bp.route('/categories', methods=['POST'])
def create_category():
    """
    새 카테고리 생성
    ---
    tags:
      - Categories
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: 카테고리 이름
            description:
              type: string
              description: 카테고리 설명
    responses:
      201:
        description: 카테고리 생성 성공
      400:
        description: 잘못된 요청 데이터
    """
    try:
        data = request.get_json(force=True, silent=False)
        name = data.get('name', '').strip()
        
        if not name:
            return api_error("카테고리 이름은 필수입니다", 400)
        
        # 중복 카테고리 확인
        existing_category = Category.query.filter_by(name=name).first()
        if existing_category:
            return api_error("이미 존재하는 카테고리입니다", 400)
        
        category = Category(
            name=name,
            description=data.get('description', '')
        )
        db.session.add(category)
        db.session.commit()
        
        return api_response(data={
            "id": category.id,
            "name": category.name,
            "description": category.description
        }, message="카테고리가 생성되었습니다")
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in create_category: {str(e)}")
        return api_error("카테고리 생성 중 오류가 발생했습니다", 500)

# ============================================================================
# 태그 API
# ============================================================================

@bp.route('/tags', methods=['GET'])
def list_tags():
    """
    태그 목록 조회
    ---
    tags:
      - Tags
    responses:
      200:
        description: 태그 목록 조회 성공
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
            data:
              type: array
              items:
                $ref: '#/definitions/Tag'
    """
    try:
        tags = Tag.query.all()
        data = [{"id": t.id, "name": t.name} for t in tags]
        return api_response(data=data)
        
    except Exception as e:
        current_app.logger.error(f"Error in list_tags: {str(e)}")
        return api_error("태그 목록 조회 중 오류가 발생했습니다", 500)

@bp.route('/tags', methods=['POST'])
def create_tag():
    """
    새 태그 생성
    ---
    tags:
      - Tags
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
          properties:
            name:
              type: string
              description: 태그 이름
    responses:
      201:
        description: 태그 생성 성공
      400:
        description: 잘못된 요청 데이터
    """
    try:
        data = request.get_json(force=True, silent=False)
        name = (data.get('name') or '').strip()
        
        if not name:
            return api_error("태그 이름은 필수입니다", 400)
        
        tag = Tag(name=name)
        db.session.add(tag)
        db.session.commit()
        
        return api_response(
            data={"id": tag.id, "name": tag.name}, 
            message="태그가 성공적으로 생성되었습니다", 
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in create_tag: {str(e)}")
        return api_error("태그 생성 중 오류가 발생했습니다", 500)

# ============================================================================
# 이미지 관리 API
# ============================================================================

# ============================================================================
# User API (사용자 등록 및 인증)
# ============================================================================

@bp.route('/users/register', methods=['POST'])
def register_user():
    """사용자 회원가입 - Cognito에서 처리하도록 안내"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        # 필수 필드 검증
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} 필드가 필요합니다.'}), 400
        
        username = data['username']
        email = data['email']
        password = data['password']
        phone = data.get('phone', '')
        
        # 기존 사용자 확인 (로컬 DB)
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            if existing_user.username == username:
                return jsonify({'error': '이미 사용 중인 아이디입니다.'}), 409
            else:
                return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 409
        
        # 로컬 DB에 사용자 정보 저장 (Cognito와 동기화용)
        new_user = User(
            username=username,
            email=email,
            phone=phone
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        # 성공 응답 - Cognito에서 계정 생성 안내
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'user_id': new_user.id,
            'next_step': 'Cognito에서 동일한 계정으로 로그인해주세요.'
        }), 201
            
    except Exception as e:
        current_app.logger.error(f'회원가입 처리 중 오류: {str(e)}')
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@bp.route('/users/login', methods=['POST'])
def login_user():
    """
    사용자 로그인
    ---
    tags:
      - Users
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              description: 사용자명 또는 이메일
            password:
              type: string
              description: 비밀번호
    responses:
      200:
        description: 로그인 성공
      400:
        description: 잘못된 요청 데이터
      401:
        description: 인증 실패
    """
    try:
        data = request.get_json(force=True, silent=False)
        
        username_or_email = (data.get('username') or '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return api_error("사용자명과 비밀번호를 입력해주세요", 400)
        
        # 사용자명 또는 이메일로 사용자 찾기
        user = User.query.filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()
        
        if not user or not user.check_password(password):
            return api_error("사용자명 또는 비밀번호가 올바르지 않습니다", 401)
        
        if not user.is_active:
            return api_error("비활성화된 계정입니다", 401)
        
        # 로그인 성공 - 사용자 정보 반환
        user_data = user.to_dict()
        
        return api_response(
            data=user_data,
            message="로그인에 성공했습니다"
        )
        
    except Exception as e:
        current_app.logger.error(f"Error in login_user: {str(e)}")
        return api_error("로그인 중 오류가 발생했습니다", 500)

@bp.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """
    사용자 정보 조회
    ---
    tags:
      - Users
    parameters:
      - name: user_id
        in: path
        required: true
        type: string
        description: 사용자 ID
    responses:
      200:
        description: 사용자 정보 조회 성공
      404:
        description: 사용자를 찾을 수 없음
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return api_error("사용자를 찾을 수 없습니다", 404)
        
        user_data = user.to_dict()
        
        return api_response(data=user_data)
        
    except Exception as e:
        current_app.logger.error(f"Error in get_user: {str(e)}")
        return api_error("사용자 정보 조회 중 오류가 발생했습니다", 500)

@bp.route('/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """
    사용자 정보 수정
    ---
    tags:
      - Users
    parameters:
      - name: user_id
        in: path
        required: true
        type: string
        description: 사용자 ID
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            phone:
              type: string
              description: 전화번호
            profile_image_url:
              type: string
              description: 프로필 이미지 URL
    responses:
      200:
        description: 사용자 정보 수정 성공
      404:
        description: 사용자를 찾을 수 없음
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return api_error("사용자를 찾을 수 없습니다", 404)
        
        data = request.get_json(force=True, silent=False)
        
        # 수정 가능한 필드들
        if 'phone' in data:
            user.phone = (data['phone'] or '').strip() or None
        
        if 'profile_image_url' in data:
            user.profile_image_url = (data['profile_image_url'] or '').strip() or None
        
        db.session.commit()
        
        user_data = user.to_dict()
        
        return api_response(
            data=user_data,
            message="사용자 정보가 수정되었습니다"
        )
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in update_user: {str(e)}")
        return api_error("사용자 정보 수정 중 오류가 발생했습니다", 500)

@bp.route('/posts/<post_id>/like', methods=['POST'])
def toggle_like(post_id):
    """게시글 좋아요 토글 (좋아요 추가/제거)"""
    try:
        # JWT 토큰에서 사용자 ID 추출 (임시로 request body에서 가져옴)
        data = request.get_json()
        current_app.logger.info(f"좋아요 요청 데이터: {data}")
        
        user_id = data.get('user_id')
        current_app.logger.info(f"추출된 user_id: {user_id}")
        
        if not user_id:
            current_app.logger.warning("사용자 ID가 없습니다.")
            return jsonify({
                "success": False,
                "message": "사용자 ID가 필요합니다."
            }), 400

        # 게시글 존재 확인
        post = Post.query.get(post_id)
        current_app.logger.info(f"게시글 조회 결과: {post.id if post else 'None'}")
        
        if not post:
            current_app.logger.warning(f"게시글을 찾을 수 없습니다: {post_id}")
            return jsonify({
                "success": False,
                "message": "게시글을 찾을 수 없습니다."
            }), 404

        # 기존 좋아요 확인
        existing_like = Like.query.filter_by(
            post_id=post_id, 
            user_id=user_id
        ).first()
        
        current_app.logger.info(f"기존 좋아요 상태: {existing_like.id if existing_like else 'None'}")

        if existing_like:
            # 좋아요 취소
            current_app.logger.info("좋아요 취소 처리")
            db.session.delete(existing_like)
            post.like_count = max(0, post.like_count - 1)  # 음수가 되지 않도록
            action = "removed"
        else:
            # 좋아요 추가
            current_app.logger.info("좋아요 추가 처리")
            new_like = Like(
                post_id=post_id,
                user_id=user_id
            )
            db.session.add(new_like)
            post.like_count += 1
            action = "added"

        db.session.commit()
        current_app.logger.info(f"좋아요 처리 완료: {action}, 현재 좋아요 수: {post.like_count}")

        return jsonify({
            "success": True,
            "message": f"좋아요가 {action}되었습니다.",
            "data": {
                "action": action,
                "like_count": post.like_count,
                "is_liked": action == "added"
            }
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"좋아요 토글 중 오류: {str(e)}")
        return jsonify({
            "success": False,
            "message": "좋아요 처리 중 오류가 발생했습니다."
        }), 500

@bp.route('/posts/<post_id>/like/status', methods=['GET'])
def get_like_status(post_id):
    """사용자의 게시글 좋아요 상태 확인"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "사용자 ID가 필요합니다."
            }), 400

        # 좋아요 상태 확인
        like = Like.query.filter_by(
            post_id=post_id, 
            user_id=user_id
        ).first()

        return jsonify({
            "success": True,
            "data": {
                "is_liked": like is not None
            }
        })

    except Exception as e:
        current_app.logger.error(f"좋아요 상태 확인 중 오류: {str(e)}")
        return jsonify({
            "success": False,
            "message": "좋아요 상태 확인 중 오류가 발생했습니다."
        }), 500

# ============================================================================
# 비밀번호 찾기 관련 API
# ============================================================================

@bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """비밀번호 찾기 - 인증 코드 요청"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({
                'success': False,
                'message': '이메일을 입력해주세요.'
            }), 400
        
        # Cognito forgot_password API 호출
        try:
            current_app.logger.info(f"Cognito API 호출 시작 - Email: {email}, ClientId: {CLIENT_ID}")
            response = cognito_client.forgot_password(
                ClientId=CLIENT_ID,
                Username=email
            )
            current_app.logger.info(f"Cognito API 호출 성공 - Response: {response}")
            
            return jsonify({
                'success': True,
                'message': '인증 코드가 이메일로 전송되었습니다. 메일함과 스팸함을 확인해주세요.'
            }), 200
            
        except cognito_client.exceptions.UserNotFoundException:
            # PreventUserExistenceErrors 고려하여 동일한 응답
            return jsonify({
                'success': True,
                'message': '인증 코드가 이메일로 전송되었습니다. 메일함과 스팸함을 확인해주세요.'
            }), 200
            
        except cognito_client.exceptions.InvalidParameterException as e:
            return jsonify({
                'success': False,
                'message': '유효하지 않은 이메일 형식입니다.'
            }), 400
            
        except cognito_client.exceptions.LimitExceededException:
            return jsonify({
                'success': False,
                'message': '요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요.'
            }), 429
            
        except Exception as e:
            current_app.logger.error(f"Forgot password error: {str(e)}")
            return jsonify({
                'success': False,
                'message': '인증 코드 전송 중 오류가 발생했습니다.'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Forgot password unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'message': '서버 오류가 발생했습니다.'
        }), 500

@bp.route('/auth/confirm-forgot-password', methods=['POST'])
def confirm_forgot_password():
    """비밀번호 찾기 - 인증 코드 확인 및 비밀번호 변경"""
    try:
        data = request.get_json()
        email = data.get('email')
        confirmation_code = data.get('confirmation_code')
        new_password = data.get('new_password')
        
        if not all([email, confirmation_code, new_password]):
            return jsonify({
                'success': False,
                'message': '모든 필드를 입력해주세요.'
            }), 400
        
        # Cognito confirm_forgot_password API 호출
        try:
            response = cognito_client.confirm_forgot_password(
                ClientId=CLIENT_ID,
                Username=email,
                ConfirmationCode=confirmation_code,
                Password=new_password
            )
            
            return jsonify({
                'success': True,
                'message': '비밀번호가 성공적으로 변경되었습니다.'
            }), 200
            
        except cognito_client.exceptions.CodeMismatchException:
            return jsonify({
                'success': False,
                'message': '인증코드가 올바르지 않습니다.'
            }), 400
            
        except cognito_client.exceptions.ExpiredCodeException:
            return jsonify({
                'success': False,
                'message': '코드가 만료되었거나 요청이 선행되지 않았습니다.'
            }), 400
            
        except cognito_client.exceptions.InvalidPasswordException:
            return jsonify({
                'success': False,
                'message': '비밀번호 정책을 확인해주세요.'
            }), 400
            
        except cognito_client.exceptions.UserNotFoundException:
            # PreventUserExistenceErrors 고려하여 동일한 응답
            return jsonify({
                'success': False,
                'message': '인증코드가 올바르지 않습니다.'
            }), 400
            
        except Exception as e:
            current_app.logger.error(f"Confirm forgot password error: {str(e)}")
            return jsonify({
                'success': False,
                'message': '비밀번호 변경 중 오류가 발생했습니다.'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Confirm forgot password unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'message': '서버 오류가 발생했습니다.'
        }), 500




