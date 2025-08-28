"""
Post Service Database Models
MSA 아키텍처에서 Post 서비스가 관리하는 데이터 구조입니다.
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

def generate_id():
    """32자리 UUID 생성"""
    return str(uuid.uuid4()).replace('-', '')

class User(db.Model):
    """사용자 정보"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(32), primary_key=True, default=generate_id)
    username = db.Column(db.String(50), nullable=False, unique=True, index=True)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    profile_image_url = db.Column(db.String(512))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        """비밀번호 해시화"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """비밀번호 검증"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """사용자 정보를 딕셔너리로 변환 (비밀번호 제외)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'profile_image_url': self.profile_image_url,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Category(db.Model):
    """카테고리 정보"""
    __tablename__ = 'categories'
    id = db.Column(db.String(32), primary_key=True, default=generate_id)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(200))  # 카테고리 설명
    created_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow)

class Post(db.Model):
    """게시글 기본 정보 (userdb.users와 author_id로 연결)"""
    __tablename__ = 'posts'
    
    id = db.Column(db.String(32), primary_key=True, default=generate_id)
    author = db.Column(db.String(100), nullable=False)  # 작성자 이름 (프론트엔드 호환용)
    author_id = db.Column(db.String(32), nullable=True, index=True)  # userdb.users.id 참조 (선택사항)
    category = db.Column(db.String(50), nullable=False, default='일반')  # 카테고리 이름 (프론트엔드 호환용)
    category_id = db.Column(db.String(32), db.ForeignKey('categories.id'), nullable=True, index=True)  # 카테고리 ID (선택사항)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)  # 게시글 내용 (프론트엔드 호환용)
    content_md = db.Column(db.Text)  # 마크다운 내용
    content_s3url = db.Column(db.String(512))  # S3 URL
    visibility = db.Column(db.Enum('PUBLIC', 'PRIVATE', 'UNLISTED'), nullable=False, default='PUBLIC')
    status = db.Column(db.Enum('PUBLISHED', 'DRAFT', 'DELETED'), nullable=False, default='PUBLISHED')
    view_count = db.Column(db.Integer, nullable=False, default=0)
    like_count = db.Column(db.Integer, nullable=False, default=0)
    comment_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    category_rel = db.relationship('Category', backref='posts', foreign_keys=[category_id])

class Tag(db.Model):
    """태그 정보"""
    __tablename__ = 'tags'
    id = db.Column(db.String(32), primary_key=True, default=generate_id)
    name = db.Column(db.String(50), nullable=False, unique=True)

class PostReaction(db.Model):
    """게시글 좋아요 (한 유저당 한 게시글에 한 번만)"""
    __tablename__ = 'post_reactions'
    post_id = db.Column(db.String(32), db.ForeignKey('posts.id', ondelete='CASCADE'), primary_key=True)
    user_id = db.Column(db.String(32), nullable=False, primary_key=True)  # userdb.users.id 참조
    created_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow)
    
    # 복합 기본키로 한 유저당 한 게시글에 한 번만 좋아요 가능
    __table_args__ = (
        db.PrimaryKeyConstraint('post_id', 'user_id'),
    )

class Like(db.Model):
    """게시글 좋아요 기록"""
    __tablename__ = 'likes'

    id = db.Column(db.String(32), primary_key=True, default=generate_id)
    post_id = db.Column(db.String(32), db.ForeignKey('posts.id'), nullable=False, index=True)
    user_id = db.Column(db.String(32), nullable=False, index=True)  # Cognito 사용자 ID
    created_at = db.Column(db.DateTime(3), nullable=False, default=datetime.utcnow)

    # 관계 설정
    post = db.relationship('Post', backref='likes')

    # 복합 유니크 제약조건 (한 사용자가 한 게시글에 좋아요를 한 번만)
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='unique_post_user_like'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat()
        }

def init_categories():
    """기본 카테고리 초기화"""
    default_categories = [
        {'name': '일반', 'description': '일반적인 게시글'},
        {'name': '공지사항', 'description': '중요한 공지사항'},
        {'name': '질문', 'description': '질문과 답변'},
        {'name': '리뷰', 'description': '제품이나 서비스 리뷰'},
        {'name': '자유게시판', 'description': '자유로운 이야기'},
        {'name': '기술', 'description': '기술 관련 게시글'},
        {'name': '일상', 'description': '일상적인 이야기'}
    ]
    
    for cat_data in default_categories:
        existing = Category.query.filter_by(name=cat_data['name']).first()
        if not existing:
            category = Category(**cat_data)
            db.session.add(category)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"카테고리 초기화 오류: {e}")



