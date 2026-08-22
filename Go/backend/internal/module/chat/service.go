package chat

import (
	"errors"
	"social-network/internal/module/notification"
)

type ChatService interface {
	SendMessage(senderID, receiverID string, req SendMessageReq) (*MessageRes, error)
	GetMessages(user1, user2 string) ([]MessageRes, error)
	GetContacts(userID string) ([]ContactRes, error)
	RecallMessage(msgID, senderID, receiverID string) error // Soft-delete: đánh dấu thu hồi
	SendTypingEvent(senderID, receiverID string) error
}

type chatService struct {
	repo ChatRepository
}

func NewChatService(repo ChatRepository) ChatService {
	return &chatService{repo: repo}
}

func (s *chatService) SendMessage(senderID, receiverID string, req SendMessageReq) (*MessageRes, error) {
	if req.Content == "" && req.ImageURL == "" {
		return nil, errors.New("tin nhắn trống")
	}

	msg := &Message{SenderID: senderID, ReceiverID: receiverID, Content: req.Content, ImageURL: req.ImageURL}
	if err := s.repo.SaveMessage(msg); err != nil {
		return nil, errors.New("lỗi gửi tin nhắn")
	}

	res := &MessageRes{
		ID:         msg.ID,
		SenderID:   msg.SenderID,
		ReceiverID: msg.ReceiverID,
		Content:    msg.Content,
		ImageURL:   msg.ImageURL,
		IsRecalled: msg.IsRecalled,
		CreatedAt:  msg.CreatedAt,
	}

	// Phát sóng real-time cho người nhận
	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":   "NEW_MESSAGE",
		"message": res,
	})
	return res, nil
}

func (s *chatService) GetMessages(user1, user2 string) ([]MessageRes, error) {
	// user1 là người đang lấy tin nhắn, user2 là contact. 
	// Đánh dấu các tin nhắn do user2 gửi cho user1 là đã đọc.
	_ = s.repo.MarkMessagesAsRead(user2, user1)

	msgs, err := s.repo.GetMessages(user1, user2)
	if err != nil {
		return nil, errors.New("lỗi tải tin nhắn")
	}
	var res []MessageRes
	for _, m := range msgs {
		res = append(res, MessageRes{
			ID:         m.ID,
			SenderID:   m.SenderID,
			ReceiverID: m.ReceiverID,
			Content:    m.Content,
			ImageURL:   m.ImageURL,
			IsRecalled: m.IsRecalled,
			CreatedAt:  m.CreatedAt,
		})
	}
	return res, nil
}

// GetContacts lấy danh sách liên hệ bằng 1 query duy nhất (fix N+1 query cũ)
func (s *chatService) GetContacts(userID string) ([]ContactRes, error) {
	ids, err := s.repo.GetContactIDs(userID)
	if err != nil {
		return nil, errors.New("lỗi tải danh sách liên hệ")
	}

	users, err := s.repo.FindContactsByIDs(ids)
	if err != nil {
		return nil, errors.New("lỗi tải thông tin liên hệ")
	}

	unreadCounts, _ := s.repo.GetUnreadCountPerContact(userID)

	var res []ContactRes
	for _, u := range users {
		isOnline := notification.SharedHub.IsOnline(u.ID)
		res = append(res, ContactRes{
			ID:          u.ID,
			FullName:    u.FullName,
			AvatarURL:   u.AvatarURL,
			IsOnline:    isOnline,
			UnreadCount: unreadCounts[u.ID],
		})
	}
	return res, nil
}

// RecallMessage thu hồi tin nhắn (soft delete) và phát sóng real-time cho người nhận
func (s *chatService) RecallMessage(msgID, senderID, receiverID string) error {
	if err := s.repo.RecallMessage(msgID, senderID); err != nil {
		return errors.New("không thể thu hồi tin nhắn này")
	}

	// Báo cho người nhận biết để FE cập nhật hiển thị
	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":      "RECALL_MESSAGE",
		"message_id": msgID,
	})
	return nil
}

// SendTypingEvent phát sóng sự kiện "Đang gõ..." cho người nhận
func (s *chatService) SendTypingEvent(senderID, receiverID string) error {
	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":     "TYPING",
		"sender_id": senderID,
	})
	return nil
}
