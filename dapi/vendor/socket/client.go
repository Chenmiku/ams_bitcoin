package socket

import (
	"encoding/json"
	"fmt"
	"github.com/alash3al/goemitter"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"strings"
	"time"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 8) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 64 * 1024
)

//Client Socket
type Client struct {
	ID         string
	Connection *websocket.Conn
	Recived    func(uri string, data string)
	Closed     func(code int, text string)
	send       chan []byte
	*Emitter.Emitter
}

func Upgrade(w http.ResponseWriter, r *http.Request, header http.Header) *websocket.Conn {
	c, err := upgrader.Upgrade(w, r, header)
	if err != nil {
		log.Print("upgrade: ", err)
		return nil
	}
	return c
}

//NewClient Socket
func NewClient(conn *websocket.Conn, onJoin func(*Client) error, onLeave func(*Client)) {

	var c = &Client{
		Connection: conn,
		ID:         uuid.New().String(),
		send:       make(chan []byte, 102400),
		Emitter:    Emitter.Construct(),
	}

	if onJoin != nil {
		if err := onJoin(c); err != nil {
			message := BuildErrorMessage("/system", err)
			conn.WriteMessage(websocket.TextMessage, message)
			c.Connection.Close()
			return
		}
	}

	if onLeave != nil {
		defer onLeave(c)
	}

	defer func() {

		if err := c.Connection.WriteMessage(websocket.CloseMessage, nil); err != nil {
			log.Printf("websocket: write closeMessage message error: %v", err)
		}

		// log.Printf("websocket: %v die", c.ID)
		c.Connection.Close()
	}()

	done := make(chan struct{}, 2)

	doneRead := make(chan struct{})

	c.On("echo", func(args ...interface{}) {
		var data = fmt.Sprintf("%v", args[0])
		c.Send([]byte(data))
	})

	go func() {

		defer func() {
			// log.Printf("websocket: read routines die")
			done <- struct{}{}
			doneRead <- struct{}{}
		}()

		c.Connection.SetReadLimit(maxMessageSize)
		c.Connection.SetReadDeadline(time.Now().Add(pongWait))
		c.Connection.SetPongHandler(func(string) error { c.Connection.SetReadDeadline(time.Now().Add(pongWait)); return nil })

		for {
			_, p, err := c.Connection.ReadMessage()
			if err != nil {
				return
			}

			if len(p) > 0 {
				s := string(p)
				i := strings.Index(s, " ")
				if i != -1 {
					uri := s[:i]
					d := s[i+1:]

					if c.Recived != nil {
						c.Recived(uri, d)
					}
					c.EmitSync(strings.Trim(uri, "/"), d)
				}
			}

		}
	}()

	go func() {

		ticker := time.NewTicker(pingPeriod)

		defer func() {
			// log.Printf("websocket: write routines die")
			ticker.Stop()
			done <- struct{}{}
		}()

		for {
			select {

			case message, ok := <-c.send:

				c.Connection.SetWriteDeadline(time.Now().Add(writeWait))
				if !ok {
					c.Connection.WriteMessage(websocket.CloseMessage, []byte{})
					// log.Printf("websocket: close message %v", ok)
					return
				}

				err := c.Connection.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					// log.Printf("websocket: write text message error: %v", err)
					return
				}

			case <-ticker.C:
				// log.Printf("websocket: write ping message")
				c.Connection.SetWriteDeadline(time.Now().Add(writeWait))
				if err := c.Connection.WriteMessage(websocket.PingMessage, nil); err != nil {
					// log.Printf("websocket: write ping message error: %v", err)
					return
				}

			case <-doneRead:
				// log.Printf("websocket: doneRead")
				return
			}
		}
	}()

	<-done
}

func (c *Client) Send(data []byte) {
	select {
	case c.send <- data:
	default:
		// log.Printf("false")
	}
}

func (c *Client) SendJson(uri string, v interface{}) {
	c.Send(BuildJsonMessage(uri, v))
}

func (c *Client) SendJsonNoUri(v interface{}) {
	var data, err = json.Marshal(v)
	if err != nil {
		panic(err)
	}

	c.Send(data)
}

//SendError to c
func (c *Client) SendError(uri string, err error) {
	c.Send(BuildErrorMessage(uri, err))
}

func (c *Client) SendString(uri string, v string) {
	c.Send(BuildStringMessage(uri, v))
}

func (c *Client) SendSuccess(uri string) {
	c.Send(BuildStringMessage(uri, "success"))
}

func (c *Client) SendUri(uri string) {
	c.Send(BuildJsonMessage(uri, nil))
}

func (c *Client) closeHandler(code int, text string) error {
	switch code {
	case websocket.CloseNormalClosure, websocket.CloseGoingAway,
		websocket.CloseNoStatusReceived:
		c.Connection.Close()
	}

	c.Closed(code, text)

	log.Printf("websocket: close %v %v \n ----- \n", code, text)
	return fmt.Errorf("websocket: close %v %v", code, text)
}
