package socket

import (
	"fmt"
	"github.com/google/uuid"
)

type Hub struct {
	Socket *WsClient
	ID     string
}

var Hubs = []*Hub{}

func Add(socket *WsClient) {

	id := uuid.New()

	Hubs = append(Hubs, &Hub{
		Socket: socket,
		ID:     id.String(),
	})
}

func Remove(id string) {
	for i, h := range Hubs {
		if h.ID == id {
			Hubs = append(Hubs[:i], Hubs[i+1:]...)
		}
	}
}

func Get(id string) *WsClient {
	for _, h := range Hubs {
		if h.ID == id {
			return h.Socket
		}
	}
	return nil
}

func List() {
	for _, h := range Hubs {
		fmt.Println("ID: %s", h.ID)
	}
}
