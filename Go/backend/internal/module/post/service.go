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
	UpdatePost(postID string, userID string, content string) error
	GetGroupPosts(groupID string, userID string, limit int, page int) ([]FeedPostResponse, error) // Đã thêm userID
	
	// Features mới: Bookmark bài viết
	ToggleSavePost(userID, postID string) (bool, error)
	GetSavedPosts(userID string, limit int, page int) ([]FeedPostResponse, error)
}

type postService struct{ repo PostRepository }

func NewPostService(repo PostRepository) PostService { return &postService{repo: repo} }

func (s *postService) CreatePost(userID string, req CreatePostRequest) (*PostResponse, error) {
	// BỨC TƯỜNG 1: NẾU ĐĂNG VÀO NHÓM, KIỂM TRA PHẢI LÀ THÀNH VIÊN KHÔNG?
	if req.GroupID != nil && *req.GroupID != "" {
		isMember := s.repo.CheckGroupMember(*req.GroupID, userID)
		if !isMember {
			return nil, errors.New("bạn phải tham gia nhóm mới được đăng bài")
		}
	}

	newPost := &Post{UserID: userID, Content: req.Content, SharedPostID: req.SharedPostID, GroupID: req.GroupID}
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

func (s *postService) UpdatePost(postID string, userID string, content string) error {
	if err := s.repo.UpdatePost(postID, userID, content); err != nil {
		return errors.New("bạn không có quyền sửa bài này")
	}
	return nil
}

// BỨC TƯỜNG 2: LẤY BÀI TRONG NHÓM PHẢI LÀ THÀNH VIÊN
func (s *postService) GetGroupPosts(groupID string, userID string, limit int, page int) ([]FeedPostResponse, error) {
	// Kiểm tra quyền
	isMember := s.repo.CheckGroupMember(groupID, userID)
	if !isMember {
		// Trả về mảng rỗng nếu chưa tham gia (chống xem trộm)
		return []FeedPostResponse{}, nil
	}

	offset := (page - 1) * limit
	posts, err := s.repo.GetGroupPosts(groupID, limit, offset)
	if err != nil {
		return nil, errors.New("lỗi tải bài viết nhóm")
	}

	var result []FeedPostResponse
	for _, p := range posts {
		result = append(result, mapPostToResponse(p))
	}
	return result, nil
}

func (s *postService) ToggleSavePost(userID, postID string) (bool, error) {
	// Kiểm tra xem bài viết có tồn tại không
	_, err := s.repo.GetPostByID(postID)
	if err != nil {
		return false, errors.New("bài viết không tồn tại")
	}
	
	isSaved, err := s.repo.ToggleSavePost(userID, postID)
	if err != nil {
		return false, errors.New("lỗi lưu bài viết")
	}
	return isSaved, nil
}

func (s *postService) GetSavedPosts(userID string, limit int, page int) ([]FeedPostResponse, error) {
	offset := (page - 1) * limit
	posts, err := s.repo.GetSavedPosts(userID, limit, offset)
	if err != nil {
		return nil, errors.New("lỗi tải danh sách bài đã lưu")
	}

	var result []FeedPostResponse
	for _, p := range posts {
		result = append(result, mapPostToResponse(p))
	}
	return result, nil
}
