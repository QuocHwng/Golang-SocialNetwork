package interaction

import (
	"time"

	"gorm.io/gorm"
)

// --- KHAI BÁO CÁC MODEL ---
type Like struct {
	PostID    string `gorm:"type:uuid;primaryKey"`
	UserID    string `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
}

type CommentAuthor struct {
	ID        string `gorm:"primaryKey"`
	FullName  string
	AvatarURL string
}

func (CommentAuthor) TableName() string { return "users" }

type Comment struct {
	ID        string        `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PostID    string        `gorm:"type:uuid;not null"`
	UserID    string        `gorm:"type:uuid;not null"`
	Author    CommentAuthor `gorm:"foreignKey:UserID;references:ID"`
	ParentID  *string       `gorm:"type:uuid"`
	Content   string        `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Follow struct {
	FollowerID  string `gorm:"type:uuid;primaryKey"`
	FollowingID string `gorm:"type:uuid;primaryKey"`
	CreatedAt   time.Time
}

// --- KHAI BÁO INTERFACE ---
type InteractionRepository interface {
	ToggleLike(postID string, userID string) (bool, error)
	CreateComment(comment *Comment) error
	GetCommentsByPostID(postID string) ([]Comment, error)
	ToggleFollow(followerID string, followingID string) (bool, error)
	UpdateComment(commentID string, userID string, content string) error
	DeleteComment(commentID string, userID string) error
}

type interactionRepo struct {
	db *gorm.DB
}

func NewInteractionRepository(db *gorm.DB) InteractionRepository {
	return &interactionRepo{db: db}
}

// =====================================================================
// 1. LIKE / UNLIKE (Kèm theo tự động tạo thông báo)
// =====================================================================
func (r *interactionRepo) ToggleLike(postID string, userID string) (bool, error) {
	var isLiked bool
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var like Like
		if err := tx.Where("post_id = ? AND user_id = ?", postID, userID).First(&like).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// TIẾN HÀNH LIKE
				if err := tx.Create(&Like{PostID: postID, UserID: userID}).Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", postID).Error; err != nil {
					return err
				}

				// TẠO THÔNG BÁO (Lấy chủ bài viết làm recipient_id. Nếu tự Like thì không thông báo)
				tx.Exec(`
					INSERT INTO notifications (recipient_id, actor_id, type, entity_id)
					SELECT user_id, ?, 'LIKE', ? FROM posts WHERE id = ? AND user_id != ?
				`, userID, postID, postID, userID)

				isLiked = true
				return nil
			}
			return err
		}

		// TIẾN HÀNH UNLIKE
		if err := tx.Delete(&like).Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?", postID).Error; err != nil {
			return err
		}
		isLiked = false
		return nil
	})
	return isLiked, err
}

// =====================================================================
// 2. COMMENT (Kèm theo tự động tạo thông báo)
// =====================================================================
func (r *interactionRepo) CreateComment(comment *Comment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// TIẾN HÀNH TẠO COMMENT
		if err := tx.Create(comment).Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", comment.PostID).Error; err != nil {
			return err
		}

		// TẠO THÔNG BÁO (Nếu tự Comment vào bài mình thì không thông báo)
		tx.Exec(`
			INSERT INTO notifications (recipient_id, actor_id, type, entity_id)
			SELECT user_id, ?, 'COMMENT', ? FROM posts WHERE id = ? AND user_id != ?
		`, comment.UserID, comment.PostID, comment.PostID, comment.UserID)

		return nil
	})
}

func (r *interactionRepo) GetCommentsByPostID(postID string) ([]Comment, error) {
	var comments []Comment
	err := r.db.Preload("Author").Where("post_id = ?", postID).Order("created_at asc").Find(&comments).Error
	return comments, err
}

// =====================================================================
// 3. FOLLOW / UNFOLLOW (Kèm theo tự động tạo thông báo)
// =====================================================================
func (r *interactionRepo) ToggleFollow(followerID string, followingID string) (bool, error) {
	var isFollowing bool
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var follow Follow
		err := tx.Where("follower_id = ? AND following_id = ?", followerID, followingID).First(&follow).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// TIẾN HÀNH FOLLOW
				if err := tx.Create(&Follow{FollowerID: followerID, FollowingID: followingID}).Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE users SET following_count = following_count + 1 WHERE id = ?", followerID).Error; err != nil {
					return err
				}
				if err := tx.Exec("UPDATE users SET followers_count = followers_count + 1 WHERE id = ?", followingID).Error; err != nil {
					return err
				}

				// TẠO THÔNG BÁO NGAY LẬP TỨC
				tx.Exec(`
					INSERT INTO notifications (recipient_id, actor_id, type, entity_id) 
					VALUES (?, ?, 'FOLLOW', ?)
				`, followingID, followerID, followerID)

				isFollowing = true
				return nil
			}
			return err
		}

		// TIẾN HÀNH UNFOLLOW
		if err := tx.Delete(&follow).Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE users SET following_count = following_count - 1 WHERE id = ?", followerID).Error; err != nil {
			return err
		}
		if err := tx.Exec("UPDATE users SET followers_count = followers_count - 1 WHERE id = ?", followingID).Error; err != nil {
			return err
		}
		isFollowing = false
		return nil
	})
	return isFollowing, err
}

func (r *interactionRepo) UpdateComment(commentID string, userID string, content string) error {
	res := r.db.Model(&Comment{}).Where("id = ? AND user_id = ?", commentID, userID).Update("content", content)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *interactionRepo) DeleteComment(commentID string, userID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var cmt Comment
		if err := tx.Where("id = ? AND user_id = ?", commentID, userID).First(&cmt).Error; err != nil {
			return err
		}
		if err := tx.Delete(&cmt).Error; err != nil {
			return err
		}
		// Xóa xong phải trừ comments_count đi 1
		if err := tx.Exec("UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?", cmt.PostID).Error; err != nil {
			return err
		}
		return nil
	})
}
