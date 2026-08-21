package server

import (
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
	// Khởi tạo Gin
	r := gin.Default()
	r.Static("/uploads", "./uploads")

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true // Cho phép mọi Frontend truy cập (Dùng khi Dev)
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	r.Use(cors.New(corsConfig))
	// 1. KHỞI TẠO CÁC MODULE (Dependency Injection)
	userRepo := user.NewUserRepository(database.DB)
	userService := user.NewUserService(userRepo)
	userHandler := user.NewUserHandler(userService)

	postRepo := post.NewPostRepository(database.DB)
	postService := post.NewPostService(postRepo)
	postHandler := post.NewPostHandler(postService)

	// Khởi tạo Module Interaction
	interactionRepo := interaction.NewInteractionRepository(database.DB)
	interactionService := interaction.NewInteractionService(interactionRepo)
	interactionHandler := interaction.NewInteractionHandler(interactionService)

	// Khởi tạo Module Notification
	notificationRepo := notification.NewNotificationRepository(database.DB)
	notificationService := notification.NewNotificationService(notificationRepo)
	notificationHandler := notification.NewNotificationHandler(notificationService)

	chatRepo := chat.NewChatRepository(database.DB)
	chatService := chat.NewChatService(chatRepo, userRepo)
	chatHandler := chat.NewChatHandler(chatService)

	// Khởi tạo Module Group
	groupRepo := group.NewGroupRepository(database.DB)
	groupService := group.NewGroupService(groupRepo)
	groupHandler := group.NewGroupHandler(groupService)

	// 2. KHAI BÁO CÁC ĐƯỜNG DẪN API (ROUTES)
	v1 := r.Group("/api/v1")
	{ // API
		auth := v1.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
		}
	}

	protected := v1.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/profile", userHandler.GetProfile)
		// THÊM DÒNG NÀY (Đăng bài viết mới)
		protected.POST("/posts", postHandler.CreatePost)
		protected.GET("/posts", postHandler.GetNewsFeed)
		protected.POST("/posts/:id/like", interactionHandler.ToggleLike)

		protected.POST("/posts/:id/comments", interactionHandler.CreateComment)
		protected.GET("/posts/:id/comments", interactionHandler.GetComments)

		protected.POST("/users/:id/follow", interactionHandler.ToggleFollow)
		// Thông báo
		protected.GET("/notifications", notificationHandler.GetMyNotifications)
		protected.PUT("/notifications/:id/read", notificationHandler.MarkAsRead)

		protected.GET("/ws", notification.ServeWS)
		protected.GET("/posts/:id", postHandler.GetPostByID)
		protected.PUT("/posts/:id", postHandler.UpdatePost)

		protected.GET("/users/search", userHandler.SearchUsers)
		protected.GET("/users/:id", userHandler.GetUserProfile)
		protected.GET("/users/:id/posts", postHandler.GetUserPosts)

		protected.POST("/upload", postHandler.UploadMedia)

		// Thêm vào chỗ // User Profile & Search:
		protected.PUT("/profile", userHandler.UpdateProfile)
		protected.DELETE("/posts/:id", postHandler.DeletePost)

		protected.PUT("/comments/:id", interactionHandler.UpdateComment)    // <-- THÊM DÒNG NÀY (Sửa cmt)
		protected.DELETE("/comments/:id", interactionHandler.DeleteComment) // <-- THÊM DÒNG NÀY (Xóa cmt)

		//chat
		protected.GET("/chat/contacts", chatHandler.GetContacts)
		protected.GET("/chat/:id", chatHandler.GetMessages)
		protected.POST("/chat/:id", chatHandler.SendMessage)
		protected.DELETE("/chat/messages/:msgId", chatHandler.RecallMessage) // Thu hồi
		protected.POST("/chat/:id/typing", chatHandler.SendTyping)           //đang type

		//group
		protected.POST("/groups", groupHandler.CreateGroup)
		protected.GET("/groups", groupHandler.GetAllGroups)
		protected.GET("/groups/:id", groupHandler.GetGroupDetail)
		protected.POST("/groups/:id/join", groupHandler.ToggleJoinGroup)
		protected.GET("/groups/:id/posts", postHandler.GetGroupPosts)

		protected.GET("/groups/:id/requests", groupHandler.GetPendingRequests)
		protected.POST("/groups/:id/requests/:userId", groupHandler.HandleRequest)
		// THÊM 2 DÒNG NÀY:
		protected.GET("/groups/:id/members", groupHandler.GetGroupMembers)
		protected.DELETE("/groups/:id/members/:userId", groupHandler.RemoveMember)

	}

	return r
}
