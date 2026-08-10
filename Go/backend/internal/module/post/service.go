package post

import (
	"errors"
	"strings"
)

type PostService interface {
	CreatePost(userID string, req CreatePostRequest) (*PostResponse, error)
	GetNewsFeed(userID string, limit int, page int) ([]FeedPostResponse, error)
	GetPostsByUserID(userID string, limit int, page int) ([]FeedPostResponse, error)
	GetPostByID(postID string) (*FeedPostResponse, error)
	DeletePost(postID string, userID string) error
	UpdatePost(postID string, userID string, content string) error // MỚI
}

type postService struct{ repo PostRepository }

func NewPostService(repo PostRepository) PostService { return &postService{repo: repo} }

func (s *postService) CreatePost(userID string, req CreatePostRequest) (*PostResponse, error) {
	newPost := &Post{UserID: userID, Content: req.Content, SharedPostID: req.SharedPostID}
	if err := s.repo.CreatePost(newPost); err != nil {
		return nil, errors.New("không thể tạo bài viết")
	}
	for _, url := range req.MediaURLs {
		mediaType := "image"
		if strings.HasSuffix(strings.ToLower(url), ".mp4") || strings.HasSuffix(strings.ToLower(url), ".webm") {
			mediaType = "video"
		}
		s.repo.CreatePostMedia(&PostMedia{PostID: newPost.ID, MediaURL: url, MediaType: mediaType})
	}
	if req.SharedPostID != nil {
		_ = s.repo.IncrementShareCount(*req.SharedPostID)
	}
	return &PostResponse{ID: newPost.ID, UserID: newPost.UserID, Content: newPost.Content, SharedPostID: newPost.SharedPostID, MediaURLs: req.MediaURLs}, nil
}
func mapPostToResponse(p Post) FeedPostResponse {
	res := FeedPostResponse{ID: p.ID, Content: p.Content, LikesCount: p.LikesCount, CommentsCount: p.CommentsCount, SharesCount: p.SharesCount, CreatedAt: p.CreatedAt, Author: AuthorInfo{ID: p.Author.ID, FullName: p.Author.FullName, AvatarURL: p.Author.AvatarURL}}
	for _, m := range p.Media {
		res.Media = append(res.Media, MediaInfo{ID: m.ID, MediaURL: m.MediaURL, MediaType: m.MediaType})
	}
	if p.SharedPost != nil {
		sharedRes := mapPostToResponse(*p.SharedPost)
		res.SharedPost = &sharedRes
	}
	return res
}
func (s *postService) GetNewsFeed(userID string, limit int, page int) ([]FeedPostResponse, error) {
	offset := (page - 1) * limit
	posts, err := s.repo.GetNewsFeed(userID, limit, offset)
	if err != nil {
		return nil, errors.New("lỗi tải bảng tin")
	}
	var result []FeedPostResponse
	for _, p := range posts {
		result = append(result, mapPostToResponse(p))
	}
	return result, nil
}
func (s *postService) GetPostsByUserID(userID string, limit int, page int) ([]FeedPostResponse, error) {
	offset := (page - 1) * limit
	posts, err := s.repo.GetPostsByUserID(userID, limit, offset)
	if err != nil {
		return nil, errors.New("lỗi tải bài viết")
	}
	var result []FeedPostResponse
	for _, p := range posts {
		result = append(result, mapPostToResponse(p))
	}
	return result, nil
}
func (s *postService) GetPostByID(postID string) (*FeedPostResponse, error) {
	post, err := s.repo.GetPostByID(postID)
	if err != nil {
		return nil, errors.New("bài viết không tồn tại")
	}
	res := mapPostToResponse(*post)
	return &res, nil
}
func (s *postService) DeletePost(postID string, userID string) error {
	if err := s.repo.DeletePost(postID, userID); err != nil {
		return errors.New("bạn không có quyền xóa bài này")
	}
	return nil
}

// HÀM MỚI
func (s *postService) UpdatePost(postID string, userID string, content string) error {
	if err := s.repo.UpdatePost(postID, userID, content); err != nil {
		return errors.New("bạn không có quyền sửa bài này")
	}
	return nil
}
