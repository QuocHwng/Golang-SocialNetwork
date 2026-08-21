package middleware

import (
	"net/http"
	"sync"
	"time"

	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

// ipEntry lưu trạng thái rate limit cho từng IP
type ipEntry struct {
	count    int
	windowAt time.Time
}

// RateLimiter quản lý in-memory rate limiting theo IP
type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]*ipEntry
	limit   int           // Số request tối đa trong 1 window
	window  time.Duration // Độ dài của window (vd: 1 phút)
}

// NewRateLimiter tạo một RateLimiter mới.
// limit: số request cho phép; window: khoảng thời gian reset.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		entries: make(map[string]*ipEntry),
		limit:   limit,
		window:  window,
	}
	// Goroutine dọn dẹp entry cũ mỗi 5 phút để tránh memory leak
	go rl.cleanup()
	return rl
}

// Allow kiểm tra xem IP có được phép gửi request không.
// Trả về true nếu trong giới hạn, false nếu đã vượt.
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.entries[ip]

	if !exists || now.After(entry.windowAt.Add(rl.window)) {
		// IP mới hoặc window đã hết → reset
		rl.entries[ip] = &ipEntry{count: 1, windowAt: now}
		return true
	}

	if entry.count >= rl.limit {
		return false
	}

	entry.count++
	return true
}

// cleanup xóa các entry cũ để tránh memory leak
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.window)
		for ip, entry := range rl.entries {
			if entry.windowAt.Before(cutoff) {
				delete(rl.entries, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Middleware trả về Gin handler áp dụng rate limiting cho route.
// Ví dụ: authGroup.Use(authLimiter.Middleware())
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip) {
			response.Error(c, http.StatusTooManyRequests,
				"Quá nhiều yêu cầu. Vui lòng thử lại sau.")
			c.Abort()
			return
		}
		c.Next()
	}
}
