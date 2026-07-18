package post

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"social-network/internal/pkg/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type PostHandler struct{ service PostService }

func NewPostHandler(service PostService) *PostHandler { return &PostHandler{service: service} }

func (h *PostHandler) CreatePost(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}
	res, err := h.service.CreatePost(userID.(string), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Đăng bài thành công", res)
}

func (h *PostHandler) GetNewsFeed(c *gin.Context) {
	userID, _ := c.Get("user_id") // Bắt buộc lấy ID để lọc News Feed
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	res, err := h.service.GetNewsFeed(userID.(string), limit, page)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []FeedPostResponse{}
	}
	response.Success(c, http.StatusOK, "Tải bảng tin thành công", res)
}

// MỚI: Lấy bài viết của 1 người cụ thể (Dùng cho Trang cá nhân)
func (h *PostHandler) GetUserPosts(c *gin.Context) {
	targetUserID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	res, err := h.service.GetPostsByUserID(targetUserID, limit, page)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []FeedPostResponse{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

func (h *PostHandler) GetPostByID(c *gin.Context) {
	postID := c.Param("id")
	res, err := h.service.GetPostByID(postID)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// API Upload File (Ảnh/Video)
func (h *PostHandler) UploadMedia(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Không tìm thấy file tải lên")
		return
	}

	// Tạo thư mục uploads ở Backend nếu chưa có
	if _, err := os.Stat("uploads"); os.IsNotExist(err) {
		os.Mkdir("uploads", os.ModePerm)
	}

	// Đổi tên file để không bao giờ bị trùng
	ext := filepath.Ext(file.Filename)
	newName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join("uploads", newName)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		response.Error(c, http.StatusInternalServerError, "Lỗi khi lưu file")
		return
	}

	// Trả về link để Frontend hiển thị và lưu vào DB
	mediaURL := "http://localhost:8080/uploads/" + newName
	response.Success(c, http.StatusOK, "Upload thành công", gin.H{"url": mediaURL})
}

// Xóa bài viết (DELETE /posts/:id)
func (h *PostHandler) DeletePost(c *gin.Context) {
	userID, _ := c.Get("user_id")
	postID := c.Param("id")
	err := h.service.DeletePost(postID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Đã xóa bài viết", nil)
}
