package interaction

import (
	"errors"
	"social-network/internal/module/notification" // Import trạm thông báo
)

type InteractionService interface {
	ToggleLike(postID string, userID string) (*ToggleLikeResponse, error)
	CreateComment(postID string, userID string, req CreateCommentRequest) (*CommentResponse, error)
	GetComments(postID string) ([]CommentResponse, error)
	ToggleFollow(followerID string, followingID string) (*ToggleFollowResponse, error)
}

type interactionService struct {
	repo InteractionRepository
}

func NewInteractionService(repo InteractionRepository) InteractionService {
	return &interactionService{repo: repo}
}

func (s *interactionService) ToggleLike(postID string, userID string) (*ToggleLikeResponse, error) {
	isLiked, err := s.repo.ToggleLike(postID, userID)
	if err != nil { return nil, errors.New("lỗi thao tác") }
	
	// (Đáng lẽ phải query chủ bài viết, nhưng ta lấy tạm để minh họa)
	// PUSH REALTIME MESSAGE (Khi React online, màn hình sẽ rung lên)
	if isLiked {
		// Ta sẽ gửi một tín hiệu nhỏ để ReactJS biết mà gọi API load lại danh sách thông báo
		notification.SharedHub.SendToUser(userID, map[string]string{
			"event": "NEW_NOTIFICATION",
			"message": "Có người vừa tương tác với bạn",
		})
	}
	return &ToggleLikeResponse{ PostID: postID, IsLiked: isLiked }, nil
}

func (s *interactionService) CreateComment(postID string, userID string, req CreateCommentRequest) (*CommentResponse, error) {
	newComment := &Comment{ PostID: postID, UserID: userID, Content: req.Content, ParentID: req.ParentID }
	if err := s.repo.CreateComment(newComment); err != nil { return nil, errors.New("lỗi gửi bình luận") }
	return &CommentResponse{ ID: newComment.ID, PostID: newComment.PostID, Content: newComment.Content, ParentID: newComment.ParentID, CreatedAt: newComment.CreatedAt }, nil
}

func (s *interactionService) GetComments(postID string) ([]CommentResponse, error) {
	comments, err := s.repo.GetCommentsByPostID(postID)
	if err != nil { return nil, errors.New("không thể tải bình luận") }
	var result []CommentResponse
	for _, c := range comments {
		result = append(result, CommentResponse{ ID: c.ID, PostID: c.PostID, Content: c.Content, ParentID: c.ParentID, Author: CommentAuthorInfo{ ID: c.Author.ID, FullName: c.Author.FullName, AvatarURL: c.Author.AvatarURL }, CreatedAt: c.CreatedAt })
	}
	return result, nil
}

func (s *interactionService) ToggleFollow(followerID string, followingID string) (*ToggleFollowResponse, error) {
	if followerID == followingID { return nil, errors.New("bạn không thể tự theo dõi chính mình") }
	isFollowing, err := s.repo.ToggleFollow(followerID, followingID)
	if err != nil { return nil, errors.New("lỗi thao tác") }

	// PUSH REALTIME: Báo cho người được theo dõi biết ngay lập tức!
	if isFollowing {
		notification.SharedHub.SendToUser(followingID, map[string]string{
			"event": "NEW_NOTIFICATION",
			"message": "Có người vừa follow bạn!",
		})
	}

	return &ToggleFollowResponse{ UserID: followingID, IsFollowing: isFollowing }, nil
}