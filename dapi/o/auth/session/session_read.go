package session

import (
	"db/mgo"
)

func GetByUserId(id string) (*Session, error) {
	var sessions *Session
	return sessions, TableSession.ReadOne(mgo.M{"userid": id}, &sessions)
}

func GetByID(id string) (*Session, error) {
	var s Session
	return &s, TableSession.ReadByID(id, &s)
}

func GetAll() ([]*Session, error) {
	var sessions = []*Session{}
	return sessions, TableSession.ReadAll(&sessions)
}
