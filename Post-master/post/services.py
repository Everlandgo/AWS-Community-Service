"""
Post Service Business Logic Layer
비즈니스 로직을 담당하는 서비스 클래스들입니다.
"""

from .models import db, Post, PostReaction, Category
from datetime import datetime
import uuid

class CategoryService:
    """카테고리 관련 비즈니스 로직"""
    
    @staticmethod
    def get_all_categories():
        """모든 카테고리 조회"""
        return Category.query.order_by(Category.name).all()
    
    @staticmethod
    def get_category(category_id):
        """카테고리 조회"""
        return Category.query.get(category_id)
    
    @staticmethod
    def create_category(name, description=None):
        """카테고리 생성"""
        category = Category(
            id=str(uuid.uuid4()).replace('-', ''),
            name=name,
            description=description
        )
        
        db.session.add(category)
        db.session.commit()
        return category

class PostService:
    """게시글 관련 비즈니스 로직"""
    
    @staticmethod
    def create_post(title, content_md, content_s3url, author_id, category_id, visibility='PUBLIC', status='DRAFT'):
        """게시글 생성"""
        post = Post(
            id=str(uuid.uuid4()).replace('-', ''),
            title=title,
            content_md=content_md,
            content_s3url=content_s3url,
            author_id=author_id,
            category_id=category_id,
            visibility=visibility,
            status=status
        )
        
        db.session.add(post)
        db.session.commit()
        return post
    
    @staticmethod
    def get_post(post_id):
        """게시글 조회 (조회수 증가)"""
        post = Post.query.get(post_id)
        if post:
            post.view_count += 1
            db.session.commit()
        return post
    
    @staticmethod
    def get_posts_by_category(category_id, page=1, per_page=10):
        """카테고리별 게시글 조회"""
        return Post.query.filter_by(
            category_id=category_id, 
            visibility='PUBLIC', 
            status='PUBLISHED'
        ).order_by(Post.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
    
    @staticmethod
    def update_post(post_id, **kwargs):
        """게시글 수정"""
        post = Post.query.get(post_id)
        if not post:
            return None
            
        for key, value in kwargs.items():
            if hasattr(post, key):
                setattr(post, key, value)
        
        post.updated_at = datetime.utcnow()
        db.session.commit()
        return post
    
    @staticmethod
    def delete_post(post_id):
        """게시글 삭제 (소프트 삭제)"""
        post = Post.query.get(post_id)
        if not post:
            return False
            
        post.status = 'DELETED'
        post.updated_at = datetime.utcnow()
        db.session.commit()
        return True
    
    @staticmethod
    def search_posts(q, visibility='PUBLIC', status='PUBLISHED', page=1, per_page=10):
        """게시글 검색"""
        query = Post.query.filter_by(visibility=visibility, status=status)
        
        if q:
            # SQLite에서는 MATCH AGAINST를 지원하지 않으므로 LIKE 검색 사용
            query = query.filter(
                db.or_(
                    Post.title.like(f'%{q}%'),
                    Post.content_md.like(f'%{q}%')
                )
            )
        
        return query.order_by(Post.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

class ReactionService:
    """반응 관련 비즈니스 로직"""
    
    @staticmethod
    def toggle_reaction(post_id, user_id):
        """게시글 좋아요 토글"""
        post = Post.query.get(post_id)
        if not post:
            return None
            
        existing_reaction = PostReaction.query.filter_by(
            post_id=post_id, user_id=user_id
        ).first()
        
        if existing_reaction:
            # 좋아요 제거
            db.session.delete(existing_reaction)
            post.like_count = max(0, post.like_count - 1)
        else:
            # 좋아요 추가
            reaction = PostReaction(post_id=post_id, user_id=user_id)
            db.session.add(reaction)
            post.like_count += 1
        
        db.session.commit()
        return post





