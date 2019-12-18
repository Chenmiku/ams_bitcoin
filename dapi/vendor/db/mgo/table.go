package mgo

import (
	"github.com/google/uuid"
	"gopkg.in/mgo.v2/bson"
	"http/web"
	"time"
)

type PagingQuery struct {
	Pipeline    []bson.M
	PageSize    int
	PageNumber  int
	SortBy      string
	SortOrder   string
	SearchBy    string
	SearchValue string
}

type Table struct {
	*UnsafeTable
	lastModify int
}

func NewTable(db *Database, name string) *Table {
	var t = &Table{UnsafeTable: NewUnsafeTable(db, name)}
	return t
}

func (t *Table) Create(i IModel) error {
	i.BeforeCreate()
	i.SetID(uuid.New().String())
	return t.UnsafeInsert(i)
}

func (t *Table) UpdateByID(id string, i IModel) error {
	i.BeforeUpdate()
	return t.UnsafeUpdateByID(id, i)
}

func (t *Table) MarkDelete(id string) error {
	var data = bson.M{
		"dtime": time.Now().Unix(),
	}
	return t.UnsafeUpdateByID(id, data)
}

func (t *Table) ReadAll(ptr interface{}) error {
	return t.UnsafeReadMany(bson.M{"dtime": 0}, ptr)
}

func (t *Table) ReadManyIn(key string, values []string, ptr interface{}) error {
	return t.UnsafeReadMany(bson.M{"dtime": 0, key: bson.M{"$in": values}}, ptr)
}

func (t *Table) ReadMany(where M, ptr interface{}) error {
	where["dtime"] = 0
	return t.UnsafeReadMany(where, ptr)
}

func (t *Table) ReadManyWithExclude(where bson.M, exclude []string, ptr interface{}) error {

	project := bson.M{}

	for _, e := range exclude {
		if len(e) > 0 {
			project[e] = 0
		}
	}

	pipeline := []bson.M{
		bson.M{"$match": where},
	}

	if len(project) > 0 {
		pipeline = append(pipeline, bson.M{"$project": project})
	}

	return t.C().Pipe(pipeline).All(ptr)
}

func (t *Table) ReadOne(where M, ptr interface{}) error {
	return t.UnsafeReadOne(where, ptr)
}

// func (t *Table) ReadOneWithExclude(where []bson.M, ptr interface{}, exclude []string) error {
// 	project := bson.M{}

// 	for _, e := range exclude {
// 		if len(e) > 0 {
// 			project[e] = 0
// 		}
// 	}

// 	if len(project) > 0 {
// 		where = append(where, bson.M{"$project": project})
// 	}
// 	return t.UnsafeReadOne(where, ptr)
// }

func (t *Table) ReadByID(id string, ptr interface{}) error {
	return t.UnsafeGetByID(id, ptr)
}

func (t *Table) NotExist(where M) error {
	where["dtime"] = 0
	var c, err = t.UnsafeTable.UnsafeCount(where)
	if err != nil {
		return err
	}
	if c > 0 {
		return web.BadRequest("already exist")
	}
	return nil
}

func (t *Table) ReadByArrID(ids []string, ptr interface{}) error {
	return t.UnsafeRunGetAll(bson.M{"_id": bson.M{"$in": ids}}, ptr)
}

func (t *Table) LastModify() (int, error) {
	collection, err := t.Col()
	if err != nil {
		return 0, err
	}
	match := M{"$match": M{"dtime": 0}}
	group := M{"$group": M{"_id": nil, "last": M{"$max": "$mtime"}}}
	res := struct {
		Last int `bson:"last"`
	}{}
	err = collection.Pipe([]M{match, group}).One(&res)
	if IsErrNotFound(err) {
		return 0, nil
	}
	return res.Last, err
}

func MaxPageNumber(count int, pageSize int) int {
	if pageSize != 0 {
		if count%pageSize == 0 {
			return count / pageSize
		}
		return count/pageSize + 1
	}
	return 0
}

func (t *Table) ReadPagingSort(where bson.M, pageSize int, pageNumber int, sortBy string, sortOrder string, ptr interface{}) (int, error) {

	pipeline := []bson.M{
		bson.M{"$match": where},
	}

	if sortBy != "" && sortOrder != "" {
		sort := bson.M{
			sortBy: 1,
		}

		if sortOrder == "descending" {
			sort = bson.M{
				sortBy: -1,
			}
		}

		pipeline = append(pipeline, bson.M{
			"$sort": sort,
		})
	}

	var skipRecord = 0
	var count = 0

	count, err := t.UnsafeCount(where)

	if err != nil {
		return 0, err
	}

	if pageSize != 0 && pageNumber != 0 {

		var maxPageNumber = MaxPageNumber(count, pageSize)

		if maxPageNumber < pageNumber {
			pageNumber = maxPageNumber
		}

		if pageNumber > 0 {
			skipRecord = pageSize * (pageNumber - 1)
		}

		pipeline = append(pipeline,
			bson.M{
				"$skip": skipRecord,
			},
			bson.M{
				"$limit": pageSize,
			},
		)

	}

	err = t.C().Pipe(pipeline).All(ptr)

	if err != nil {
		return 0, err
	}

	return count, nil
}

func (t *Table) ReadPagingByQuery(q PagingQuery, ptr interface{}) (int, error) {

	if q.SearchBy != "" && q.SearchValue != "" {
		q.Pipeline = append(q.Pipeline, bson.M{
			"$match": bson.M{
				q.SearchBy: bson.M{
					"$regex": bson.RegEx{
						Pattern: ".*" + q.SearchValue + ".*",
						Options: "i",
					},
				},
			},
		})
	}

	if q.SortBy != "" && q.SortOrder != "" {
		sort := bson.M{
			q.SortBy: 1,
		}

		if q.SortOrder == "descending" {
			sort = bson.M{
				q.SortBy: -1,
			}
		}

		q.Pipeline = append(q.Pipeline, bson.M{
			"$sort": sort,
		})
	}

	var skipRecord = 0
	var count = 0

	type countType struct {
		Count int `json:"count" bson:"count"`
	}

	var countRes = &countType{}

	countPipeline := append(q.Pipeline, bson.M{
		"$count": "count",
	})

	t.C().Pipe(countPipeline).One(countRes)

	count = countRes.Count

	if q.PageSize != 0 && q.PageNumber != 0 {

		var maxPageNumber = MaxPageNumber(count, q.PageSize)

		if maxPageNumber < q.PageNumber {
			q.PageNumber = maxPageNumber
		}

		if q.PageNumber > 0 {
			skipRecord = q.PageSize * (q.PageNumber - 1)
		}

		q.Pipeline = append(q.Pipeline,
			bson.M{
				"$skip": skipRecord,
			},
			bson.M{
				"$limit": q.PageSize,
			},
		)

	}

	err := t.C().Pipe(q.Pipeline).All(ptr)

	if err != nil {
		return 0, err
	}

	return count, nil
}

func (t *Table) ReadPaginationByQuery(q PagingQuery, ptr interface{}) error {
	if q.SearchBy != "" && q.SearchValue != "" {
		q.Pipeline = append(q.Pipeline, bson.M{
			"$match": bson.M{
				q.SearchBy: bson.M{
					"$regex": bson.RegEx{
						Pattern: ".*" + q.SearchValue + ".*",
						Options: "i",
					},
				},
			},
		})
	}

	if q.SortBy != "" && q.SortOrder != "" {
		sort := bson.M{
			q.SortBy: 1,
		}

		if q.SortOrder == "descending" {
			sort = bson.M{
				q.SortBy: -1,
			}
		}

		q.Pipeline = append(q.Pipeline, bson.M{
			"$sort": sort,
		})
	}

	var skipRecord = 0
	var count = 0

	type countType struct {
		Count int `json:"count" bson:"count"`
	}

	var countRes = &countType{}

	countPipeline := append(q.Pipeline, bson.M{
		"$count": "count",
	})

	t.C().Pipe(countPipeline).One(countRes)

	count = countRes.Count

	if q.PageSize != 0 && q.PageNumber != 0 {

		var maxPageNumber = MaxPageNumber(count, q.PageSize)

		if maxPageNumber < q.PageNumber {
			q.PageNumber = maxPageNumber
		}

		if q.PageNumber > 0 {
			skipRecord = q.PageSize * (q.PageNumber - 1)
		}

		q.Pipeline = append(q.Pipeline,
			bson.M{
				"$skip": skipRecord,
			},
			bson.M{
				"$limit": q.PageSize,
			},
		)

	}

	err := t.C().Pipe(q.Pipeline).All(ptr)

	if err != nil {
		return err
	}

	return nil
}

func (t *Table) ReadOneByQuery(q []bson.M, ptr interface{}) error {

	err := t.C().Pipe(q).One(ptr)

	if err != nil {
		return err
	}

	return nil
}

func (t *Table) ReadByQuery(q []bson.M, ptr interface{}) error {

	err := t.C().Pipe(q).All(ptr)

	if err != nil {
		return err
	}

	return nil
}

func (t *Table) ReadPagingSortWithExclude(where bson.M, pageSize int, pageNumber int, sortBy string, sortOrder string, ptr interface{}, exclude []string) (int, error) {

	pipeline := []bson.M{
		bson.M{"$match": where},
	}

	if sortBy != "" && sortOrder != "" {
		sort := bson.M{
			sortBy: 1,
		}

		if sortOrder == "descending" {
			sort = bson.M{
				sortBy: -1,
			}
		}

		pipeline = append(pipeline, bson.M{
			"$sort": sort,
		})
	}

	var skipRecord = 0
	var count = 0

	count, err := t.UnsafeCount(where)

	if err != nil {
		return 0, err
	}

	if pageSize != 0 && pageNumber != 0 {

		var maxPageNumber = MaxPageNumber(count, pageSize)

		if maxPageNumber < pageNumber {
			pageNumber = maxPageNumber
		}

		if pageNumber > 0 {
			skipRecord = pageSize * (pageNumber - 1)
		}

		pipeline = append(pipeline,
			bson.M{
				"$skip": skipRecord,
			},
			bson.M{
				"$limit": pageSize,
			},
		)

	}

	project := bson.M{}

	for _, e := range exclude {
		if len(e) > 0 {
			project[e] = 0
		}
	}

	if len(project) > 0 {
		pipeline = append(pipeline, bson.M{"$project": project})
	}

	err = t.C().Pipe(pipeline).All(ptr)

	if err != nil {
		return 0, err
	}

	return count, nil
}

func (t *Table) ReadPagingByQueryWithExclude(q PagingQuery, ptr interface{}, exclude []string) (int, error) {

	if q.SearchBy != "" && q.SearchValue != "" {
		q.Pipeline = append(q.Pipeline, bson.M{
			"$match": bson.M{
				q.SearchBy: bson.M{
					"$regex": bson.RegEx{
						Pattern: ".*" + q.SearchValue + ".*",
						Options: "i",
					},
				},
			},
		})
	}

	if q.SortBy != "" && q.SortOrder != "" {
		sort := bson.M{
			q.SortBy: 1,
		}

		if q.SortOrder == "descending" {
			sort = bson.M{
				q.SortBy: -1,
			}
		}

		q.Pipeline = append(q.Pipeline, bson.M{
			"$sort": sort,
		})
	}

	var skipRecord = 0
	var count = 0

	type countType struct {
		Count int `json:"count" bson:"count"`
	}

	var countRes = &countType{}

	countPipeline := append(q.Pipeline, bson.M{
		"$count": "count",
	})

	t.C().Pipe(countPipeline).One(countRes)

	count = countRes.Count

	if q.PageSize != 0 && q.PageNumber != 0 {

		var maxPageNumber = MaxPageNumber(count, q.PageSize)

		if maxPageNumber < q.PageNumber {
			q.PageNumber = maxPageNumber
		}

		if q.PageNumber > 0 {
			skipRecord = q.PageSize * (q.PageNumber - 1)
		}

		q.Pipeline = append(q.Pipeline,
			bson.M{
				"$skip": skipRecord,
			},
			bson.M{
				"$limit": q.PageSize,
			},
		)

	}

	project := bson.M{}

	for _, e := range exclude {
		if len(e) > 0 {
			project[e] = 0
		}
	}

	if len(project) > 0 {
		q.Pipeline = append(q.Pipeline, bson.M{"$project": project})
	}

	err := t.C().Pipe(q.Pipeline).All(ptr)

	if err != nil {
		return 0, err
	}

	return count, nil
}
