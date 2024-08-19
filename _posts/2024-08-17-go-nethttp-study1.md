---
title: net/http study[1]-basic usage
categories: [go]
tags: [go,net,http]     # TAG names should always be lowercase
---
## Enhancement in go1.22
1. routing  

## Advanced routing  
1. Support method based routing
    - Before
        ```go
        router.HandleFunc("/todos", FindByID)

        func FindByID(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodGet {
                //handlre get
        }else if r.Method == http.MethodPost {
                    //handle post
        }else{
            //handle other method
            }    
        }
        
        ```

    - After
        ```go
        router.Handle("GET /todos", handler1)
        router.Handle("POST /todos", handler2)
        ```
        **If a path no explicit method defined, it will handle any method that have not been defined explicitly.**

        ```go
        router.Handle("PUT /todos", handler1)
        router.Handle("/todos", handler2)
        ```
        The `handler2` will handle the request of `GET POST DELETE PUT /todos`
2. Support host based routing
3. Support wide card routing (path parameter)  
        example:  
        `/{message}`  
        `/products/{slug}`  
        `/{id}/elements`  
        Unvalid example:    
        `/product_{id}`  
        `/articles/{slug}.html`  

    `r.PathValue("id")` to get the value of the path parameter
    - basic usage  
       
        `curl "http://localhost:8080/todos/123?p=1"`

        ```go
        router.HandleFunc("GET /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
            id := r.PathValue("id")
            p := r.URL.Query().Get("p")
            w.Write([]byte("get a todo by id " + id + " " + p))
        })
        ```
    - multiple wildcards
        `/chats/{id}/message/{index}`
    - Matching remainder  
        The last wildcard in a pattern can optionally match all remaining path segments by having its name end in `...`
        ```go
        mux.HandleFunc("/tree/{steps...}", handler)

        urls := []string{
            "/tree/1",        //match
            "/tree/1/2",      //match
            "/tree/1/2/test", //match
            "/tree/",         //miss
            "/tree",          //miss
            "/none",          //miss
        }

        ```
    - *Pattern with trailing slash*
        If a routing pattern ends in a trailing slash, that will result in an `anonymous` `...`

        ```go
        mux.HandleFunc("/tree/", handler)

        urls := []string{
            "/tree/1",        //match
            "/tree/1/2",      //match
            "/tree/1/2/test", //match
            "/tree/",         //match
            "/tree",          //miss
            "/none",          //miss
        }
        //Note that we can’t retrieve the steps using r.PathValue, so we use r.URL.Path instead.
        func handler(w http.ResponseWriter, r *http.Request) {
            fmt.Printf("URL Path received: %s\n", r.URL.Path)
        }
        ```
     - Match end of URL {$}
        ```go
        mux.HandleFunc("/tree/{$}", handler)

        urls := []string{
            "/tree/",     //match
            "/tree",      //miss
            "/tree/1",    //miss
            "/none",       //miss
        }
        ```
- Conflicting paths & precedence
    1. most specific wins
        ```go
        router.Handle("/items/{id}", handler1)
        router.Handle("/items/latest", handler2)
        ```
         the request `/items/latest` will be handled by `handler2`
    2. conflict detection
        ```go
        router.Handle("GET /todos/{id}", handler1)
        router.Handle("GET /{resource}/123", handler2)
        ```
        will panic at runtime in compile time,and error as below:
        ```
        panic: pattern "GET /{resources}/123" (registered at /Users/winter_wang/go1.22_projects/demo/main.go:34) conflicts with pattern "GET /todos/{id}" (registered at /Users/winter_wang/go1.22_projects/demo/main.go:18):
        GET /{resources}/123 and GET /todos/{id} both match some paths, like "/todos/123".
        But neither is more specific than the other.
        GET /{resources}/123 matches "/resources/123", but GET /todos/{id} doesn't.
        GET /todos/{id} matches "/todos/id", but GET /{resources}/123 doesn't.
        ```


## Middleware
Here is a simple example to implement middlewares using ntt/http package.
```go
type Middleware func(handler http.Handler) http.Handler

func CreateStack(xs ...Middleware) Middleware {
	return func(next http.Handler) http.Handler {
		for i := len(xs) - 1; i >= 0; i-- {
			x := xs[i]
			next = x(next)
		}
		return next
	}
}

func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		println("before")
		next.ServeHTTP(w, r)
		println("after")
	})
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Auth: checking authorization")
		if r.Header.Get("Authorization") == "" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

```go
func main() {
	router := http.NewServeMux()
	router.HandleFunc("POST /todos", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("create a todo"))
	})

	router.HandleFunc("GET /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		p := r.URL.Query().Get("p")
		w.Write([]byte("get a todo by id " + id + " " + p))

	})

	router.HandleFunc("PATCH /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		w.Write([]byte("update a todo by id " + id))
	})

	router.HandleFunc("DELETE /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		w.Write([]byte("delete a todo by id " + id))
	})

	stack := CreateStack(LoggerMiddleware, AuthMiddleware)

	ere := http.ListenAndServe("localhost:8090", stack(router))
	if ere != nil {
		panic(ere)
	}
}   
```

## Group Routing and subrouting
`http.StripPrefix` to create a group routing  
```go
func main() {
	router := http.NewServeMux()
	g1 := http.NewServeMux()

	router.HandleFunc("POST /todos", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("create a todo"))
	})
	router.HandleFunc("GET /todos/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		p := r.URL.Query().Get("p")
		w.Write([]byte("get a todo by id " + id + " " + p))

	})
	g1.Handle("/v1/", http.StripPrefix("/v1", router))

	stack := CreateStack(LoggerMiddleware)

	ere := http.ListenAndServe("localhost:8090", stack(g1))
	if ere != nil {
		panic(ere)
	}
}
```
## Pass through context
```go

const TokenKey = "Authorization"

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Auth: checking authorization")
		if r.Header.Get("Authorization") == "" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		ctx := context.WithValue(r.Context(), TokenKey, r.Header.Get("Authorization"))
		req := r.WithContext(ctx)
		next.ServeHTTP(w, req)
	})
}
```

## Reference
https://www.willem.dev/articles/url-path-parameters-in-routes/  
https://www.youtube.com/watch?v=H7tbjKFSg58
   
    