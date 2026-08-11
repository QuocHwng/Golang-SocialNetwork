package chat

import (
	"errors"
	"social-network/internal/module/notification"
	"social-network/internal/module/user"
)

type ChatService interface {
	SendMessage(senderID, receiverID string, req SendMessageReq) (*MessageRes, error)
	GetMessages(user1, user2 string) ([]MessageRes, error)
	GetContacts(userID string) ([]ContactRes, error)
	RecallMessage(msgID, senderID, receiverID string) error // MỚI
	SendTypingEvent(senderID, receiverID string) error      // MỚI
}

type chatService struct {
	repo     ChatRepository
	userRepo user.UserRepository
}

func NewChatService(repo ChatRepository, userRepo user.UserRepository) ChatService {
	return &chatService{repo: repo, userRepo: userRepo}
}

func (s *chatService) SendMessage(senderID, receiverID string, req SendMessageReq) (*MessageRes, error) {
	// Không có chữ và cũng không có ảnh thì chặn
	if req.Content == "" && req.ImageURL == "" {
		return nil, errors.New("tin nhắn trống")
	}

	msg := &Message{SenderID: senderID, ReceiverID: receiverID, Content: req.Content, ImageURL: req.ImageURL}
	if err := s.repo.SaveMessage(msg); err != nil {
		return nil, errors.New("lỗi gửi tin nhắn")
	}

	res := &MessageRes{ID: msg.ID, SenderID: msg.SenderID, ReceiverID: msg.ReceiverID, Content: msg.Content, ImageURL: msg.ImageURL, CreatedAt: msg.CreatedAt}

	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":   "NEW_MESSAGE",
		"message": res,
	})
	return res, nil
}

func (s *chatService) GetMessages(user1, user2 string) ([]MessageRes, error) {
	msgs, err := s.repo.GetMessages(user1, user2)
	if err != nil {
		return nil, errors.New("lỗi tải tin nhắn")
	}
	var res []MessageRes
	for _, m := range msgs {
		res = append(res, MessageRes{ID: m.ID, SenderID: m.SenderID, ReceiverID: m.ReceiverID, Content: m.Content, ImageURL: m.ImageURL, CreatedAt: m.CreatedAt})
	}
	return res, nil
}

func (s *chatService) GetContacts(userID string) ([]ContactRes, error) {
	ids, err := s.repo.GetContactIDs(userID)
	if err != nil {
		return nil, errors.New("lỗi tải danh sách liên hệ")
	}
	var res []ContactRes
	for _, id := range ids {
		u, err := s.userRepo.FindByID(id)
		if err == nil {
			res = append(res, ContactRes{ID: u.ID, FullName: u.FullName, AvatarURL: u.AvatarURL})
		}
	}
	return res, nil
}

// MỚI: Thu hồi tin nhắn và phát sóng Real-time
func (s *chatService) RecallMessage(msgID, senderID, receiverID string) error {
	if err := s.repo.DeleteMessage(msgID, senderID); err != nil {
		return errors.New("không thể thu hồi tin nhắn này")
	}

	// Báo cho người nhận biết tin nhắn này đã bị xóa để họ ẩn nó khỏi màn hình
	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":      "RECALL_MESSAGE",
		"message_id": msgID,
	})
	return nil
}

// MỚI: Phát sóng "Đang gõ..."
func (s *chatService) SendTypingEvent(senderID, receiverID string) error {
	notification.SharedHub.SendToUser(receiverID, map[string]interface{}{
		"event":     "TYPING",
		"sender_id": senderID,
	})
	return nil
}
