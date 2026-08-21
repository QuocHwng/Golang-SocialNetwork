package server

import (
	"os"
	"strings"
	"time"

	"social-network/internal/middleware"
	"social-network/internal/module/chat"
	"social-network/internal/module/group"
	"social-network/internal/module/interaction"
	"social-network/internal/module/notification"
	"social-network/internal/module/post"
	"social-network/internal/module/user"
	"social-network/internal/pkg/database"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter chịu trách nhiệm khởi tạo tất cả các route của ứng dụng
func SetupRouter() *gin.Engine {
	r := gin.Default()
	r.Static("/uploads", "./uploads")

	// ── CORS ─────────────────────────────────────────────────────────────
	// Đọc danh sách origin được phép từ env ALLOWED_ORIGINS (phân cách bằng dấu phẩy)
	// Ví dụ: ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
	corsConfig := cors.DefaultConfig()
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" || allowedOrigins == "*" {
		corsConfig.AllowAllOrigins = true
	} else {
		corsConfig.AllowOrigins = strings.Split(allowedOrigins, ",")
	}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	r.Use(cors.New(corsConfig))

	// ── DEPENDENCY INJECTION ──────────────────────────────────────────────
	userRepo := user.NewUserRepository(database.DB)
	userService := user.NewUserService(userRepo)
	userHandler := user.NewUserHandler(userService)

	postRepo := post.NewPostRepository(database.DB)
	postService := post.NewPostService(postRepo)
	postHandler := post.NewPostHandler(postService)

	interactionRepo := interaction.NewInteractionRepository(database.DB)
	interactionService := interaction.NewInteractionService(interactionRepo)
	interactionHandler := interaction.NewInteractionHandler(interactionService)

	notificationRepo := notification.NewNotificationRepository(database.DB)
	notificationService := notification.NewNotificationService(notificationRepo)
	notificationHandler := notification.NewNotificationHandler(notificationService)

	chatRepo := chat.NewChatRepository(database.DB)
	chatService := chat.NewChatService(chatRepo)
	chatHandler := chat.NewChatHandler(chatService)

	groupRepo := group.NewGroupRepository(database.DB)
	groupService := group.NewGroupService(groupRepo)
	groupHandler := group.NewGroupHandler(groupService)

	// ── RATE LIMITER ──────────────────────────────────────────────────────
	// Giới hạn 10 request / phút / IP cho các endpoint đăng ký & đăng nhập
	authLimiter := middleware.NewRateLimiter(10, time.Minute)

	// ── ROUTES ───────────────────────────────────────────────────────────
	v1 := r.Group("/api/v1")

	// Public routes (không cần JWT)
	auth := v1.Group("/auth")
	auth.Use(authLimiter.Middleware()) // Rate limit để chống brute-force
	{
		auth.POST("/register", userHandler.Register)
		auth.POST("/login", userHandler.Login)
	}

	protected := v1.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// ── User ─────────────────────────────────────────────────────────
		protected.GET("/profile", userHandler.GetProfile)
		protected.PUT("/profile", userHandler.UpdateProfile)
		protected.GET("/users/search", userHandler.SearchUsers)
		protected.GET("/users/:id", userHandler.GetUserProfile)
		protected.GET("/users/:id/posts", postHandler.GetUserPosts)
		protected.GET("/users/:id/followers", userHandler.GetFollowers) // [NEW] Danh sách followers
		protected.GET("/users/:id/following", userHandler.GetFollowing) // [NEW] Danh sách following

		// ── Post ─────────────────────────────────────────────────────────
		protected.POST("/posts", postHandler.CreatePost)
		protected.GET("/posts", postHandler.GetNewsFeed)
		protected.GET("/posts/saved", postHandler.GetSavedPosts) // [NEW] Lấy bài đã lưu (PHẢI NẰM TRÊN :id)
		protected.GET("/posts/search", postHandler.SearchPosts)  // [NEW] Tìm kiếm bài viết
		protected.GET("/posts/:id", postHandler.GetPostByID)
		protected.PUT("/posts/:id", postHandler.UpdatePost)
		protected.DELETE("/posts/:id", postHandler.DeletePost)
		protected.POST("/posts/:id/save", postHandler.ToggleSavePost) // [NEW] Lưu / Bỏ lưu bài
		protected.POST("/posts/:id/report", postHandler.ReportPost)   // [NEW] Báo cáo bài viết
		protected.POST("/upload", postHandler.UploadMedia)

		// ── Interaction ──────────────────────────────────────────────────
		protected.POST("/posts/:id/like", interactionHandler.ToggleLike)
		protected.POST("/posts/:id/comments", interactionHandler.CreateComment)
		protected.GET("/posts/:id/comments", interactionHandler.GetComments)
		protected.PUT("/comments/:id", interactionHandler.UpdateComment)
		protected.DELETE("/comments/:id", interactionHandler.DeleteComment)
		protected.POST("/users/:id/follow", interactionHandler.ToggleFollow)

		// ── Notification ─────────────────────────────────────────────────
		protected.GET("/ws", notification.ServeWS)
		protected.GET("/notifications", notificationHandler.GetMyNotifications)
		protected.PUT("/notifications/read-all", notificationHandler.MarkAllAsRead) // [NEW] Đọc tất cả
		protected.PUT("/notifications/:id/read", notificationHandler.MarkAsRead)

		// ── Chat ─────────────────────────────────────────────────────────
		protected.GET("/chat/contacts", chatHandler.GetContacts)
		protected.GET("/chat/:id", chatHandler.GetMessages)
		protected.POST("/chat/:id", chatHandler.SendMessage)
		protected.DELETE("/chat/messages/:msgId", chatHandler.RecallMessage)
		protected.POST("/chat/:id/typing", chatHandler.SendTyping)

		// ── Group ─────────────────────────────────────────────────────────
		protected.POST("/groups", groupHandler.CreateGroup)
		protected.GET("/groups", groupHandler.GetAllGroups)
		protected.GET("/groups/:id", groupHandler.GetGroupDetail)
		protected.POST("/groups/:id/join", groupHandler.ToggleJoinGroup)
		protected.GET("/groups/:id/posts", postHandler.GetGroupPosts)
		protected.GET("/groups/:id/requests", groupHandler.GetPendingRequests)
		protected.POST("/groups/:id/requests/:userId", groupHandler.HandleRequest)
		protected.GET("/groups/:id/members", groupHandler.GetGroupMembers)
		protected.DELETE("/groups/:id/members/:userId", groupHandler.RemoveMember)
	}

	return r
}
