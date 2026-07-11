package post

import "errors"

type PostService interface {
	CreatePost(userID string, req CreatePostRequest) (*PostResponse, error)
	GetNewsFeed(limit int, page int) ([]FeedPostResponse, error)
	GetPostByID(postID string) (*FeedPostResponse, error) // <-- THÊM MỚI
}

type postService struct {
	repo PostRepository
}

func NewPostService(repo PostRepository) PostService {
	return &postService{repo: repo}
}

func (s *postService) CreatePost(userID string, req CreatePostRequest) (*PostResponse, error) {
	newPost := &Post{UserID: userID, Content: req.Content, SharedPostID: req.SharedPostID}
	if err := s.repo.CreatePost(newPost); err != nil {
		return nil, errors.New("không thể tạo bài viết")
	}
	if req.SharedPostID != nil {
		_ = s.repo.IncrementShareCount(*req.SharedPostID)
	}
	return &PostResponse{ID: newPost.ID, UserID: newPost.UserID, Content: newPost.Content, SharedPostID: newPost.SharedPostID, LikesCount: newPost.LikesCount, CommentsCount: newPost.CommentsCount, SharesCount: newPost.SharesCount, CreatedAt: newPost.CreatedAt}, nil
}

// Hàm hỗ trợ map dữ liệu
func mapPostToResponse(p Post) FeedPostResponse {
	res := FeedPostResponse{
		ID: p.ID, Content: p.Content, LikesCount: p.LikesCount, CommentsCount: p.CommentsCount, SharesCount: p.SharesCount, CreatedAt: p.CreatedAt,
		Author: AuthorInfo{ID: p.Author.ID, FullName: p.Author.FullName, AvatarURL: p.Author.AvatarURL},
	}
	if p.SharedPost != nil {
		sharedRes := mapPostToResponse(*p.SharedPost)
		res.SharedPost = &sharedRes
	}
	return res
}

func (s *postService) GetNewsFeed(limit int, page int) ([]FeedPostResponse, error) {
	offset := (page - 1) * limit
	posts, err := s.repo.GetNewsFeed(limit, offset)
	if err != nil {
		return nil, errors.New("lỗi khi tải bảng tin")
	}
	var result []FeedPostResponse
	for _, p := range posts {
		result = append(result, mapPostToResponse(p))
	}
	return result, nil
}

// HÀM MỚI: Gọi logic lấy 1 bài
func (s *postService) GetPostByID(postID string) (*FeedPostResponse, error) {
	post, err := s.repo.GetPostByID(postID)
	if err != nil {
		return nil, errors.New("bài viết không tồn tại hoặc đã bị xóa")
	}
	res := mapPostToResponse(*post)
	return &res, nil
}
