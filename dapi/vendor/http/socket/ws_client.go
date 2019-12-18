package socket

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"log"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WsClient struct {
	ID string
	*websocket.Conn
	CloseHandler  func(code int, text string)
	ReciveHandler func(data []byte)
	close         bool
}

func NewSocket(w http.ResponseWriter, r *http.Request, header http.Header) *WsClient {

	c, err := upgrader.Upgrade(w, r, header)

	if err != nil {
		log.Print("upgrade:", err)
		return nil
	}

	var wsClient = &WsClient{
		Conn:  c,
		ID:    uuid.New().String(),
		close: false,
	}

	wsClient.SetCloseHandler(wsClient.closeHandler)

	go func() {
		for {
			if wsClient.close {
				return
			}
			wsClient.Read()
		}
	}()

	return wsClient
}

func (s *WsClient) Read() {
	_, message, err := s.Conn.ReadMessage()
	if err != nil {
		log.Println("read:", err)
		s.Close()
	}

	s.ReciveHandler(message)

}

func (s *WsClient) Write(data []byte) {
	err := s.Conn.WriteMessage(websocket.TextMessage, data)

	if err != nil {
		log.Println("write:", err)
		s.Close()
	}
}

func (s *WsClient) closeHandler(code int, text string) error {
	s.CloseHandler(code, text)
	s.Close()
	return fmt.Errorf("websocket: close %v %v", code, text)
}

func (s *WsClient) Close() {
	s.close = true
	s.Conn.Close()
}
