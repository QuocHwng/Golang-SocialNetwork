package post

import (
	"context"
	"net/http"
	"strconv"

	"social-network/internal/pkg/response"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
)

type PostHandler struct {
	service PostService
}

func NewPostHandler(service PostService) *PostHandler {
	return &PostHandler{service: service}
}

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

func (h *PostHandler) UpdatePost(c *gin.Context) {
	userID, _ := c.Get("user_id")
	postID := c.Param("id")
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}

	err := h.service.UpdatePost(postID, userID.(string), req.Content)
	if err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Đã cập nhật bài viết", nil)
}

// =========================================================================
// HÀM UPLOAD MEDIA LÊN CLOUDINARY (Xịn xò nhất)
// =========================================================================
func (h *PostHandler) UploadMedia(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Không tìm thấy file tải lên")
		return
	}
	defer file.Close()

	cld, err := cloudinary.New()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Lỗi kết nối Cloudinary: "+err.Error())
		return
	}

	resourceType := "image"
	contentType := header.Header.Get("Content-Type")
	if contentType == "video/mp4" || contentType == "video/webm" || contentType == "video/quicktime" {
		resourceType = "video"
	}

	ctx := context.Background()
	uploadResult, err := cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder:       "social_network",
		ResourceType: resourceType,
	})

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Lỗi khi đẩy file lên Cloud: "+err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Upload thành công", gin.H{"url": uploadResult.SecureURL})
}

func (h *PostHandler) GetGroupPosts(c *gin.Context) {
	userID, _ := c.Get("user_id") // THÊM DÒNG NÀY ĐỂ LẤY ID NGƯỜI ĐANG YÊU CẦU XEM
	groupID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	// CHUYỀN THÊM userID VÀO ĐÂY ĐỂ SERVICE KIỂM TRA
	res, err := h.service.GetGroupPosts(groupID, userID.(string), limit, page)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []FeedPostResponse{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}
